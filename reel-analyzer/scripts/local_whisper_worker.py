#!/usr/bin/env python3
"""
Local faster-whisper worker — the ₹0 transcription path.

Runs on your own machine. Polls the deployment for a job parked in
`transcribing`, downloads the video from the signed Supabase Storage URL,
transcribes it locally, and posts the transcript back, which resumes the
pipeline at the analysis stage.

Nothing about this needs a cloud instance, so there is no billing surface to
leave running by accident.

Setup:
    pip install faster-whisper requests
    export REEL_ANALYZER_URL=https://your-deployment.vercel.app
    export WORKER_SHARED_SECRET=<the same value set on the deployment>
    python3 scripts/local_whisper_worker.py

The deployment must have TRANSCRIPTION_PROVIDER=local for jobs to reach here.
"""

from __future__ import annotations

import os
import sys
import time
import tempfile

try:
    import requests
except ImportError:
    sys.exit("pip install requests")

try:
    from faster_whisper import WhisperModel
except ImportError:
    sys.exit("pip install faster-whisper")


BASE_URL = os.environ.get("REEL_ANALYZER_URL", "http://localhost:3000").rstrip("/")
SECRET = os.environ.get("WORKER_SHARED_SECRET")
MODEL_SIZE = os.environ.get("WHISPER_MODEL", "base")
# "cpu" works everywhere; "cuda" if you have an NVIDIA card. int8 keeps a
# laptop honest — it is roughly 4x smaller in memory than float16.
DEVICE = os.environ.get("WHISPER_DEVICE", "cpu")
COMPUTE_TYPE = os.environ.get("WHISPER_COMPUTE_TYPE", "int8")
POLL_SECONDS = float(os.environ.get("WORKER_POLL_SECONDS", "5"))

if not SECRET:
    sys.exit("WORKER_SHARED_SECRET is not set")

AUTH = {"Authorization": f"Bearer {SECRET}"}


def claim():
    """Ask for the oldest job waiting on transcription. Returns None when idle."""
    response = requests.post(f"{BASE_URL}/api/worker/claim", headers=AUTH, timeout=30)
    if response.status_code == 409:
        sys.exit("this deployment is not set to TRANSCRIPTION_PROVIDER=local")
    response.raise_for_status()
    return response.json().get("job")


def download(url: str) -> str:
    """Stream the video to a temp file rather than holding it in memory."""
    handle, path = tempfile.mkstemp(suffix=".mp4")
    os.close(handle)
    with requests.get(url, stream=True, timeout=300) as response:
        response.raise_for_status()
        with open(path, "wb") as out:
            for chunk in response.iter_content(chunk_size=1 << 20):
                out.write(chunk)
    return path


def transcribe(model: WhisperModel, path: str) -> dict:
    # faster-whisper reads the audio track straight out of the .mp4, so no
    # separate ffmpeg extraction step is needed here.
    segments, info = model.transcribe(path, vad_filter=True)

    collected = []
    for segment in segments:
        text = segment.text.strip()
        if text:
            collected.append({"start": segment.start, "end": segment.end, "text": text})

    return {
        "full_text": " ".join(item["text"] for item in collected).strip(),
        "segments": collected,
        "language": info.language,
        "duration_seconds": info.duration,
    }


def submit(job_id: str, payload: dict) -> None:
    response = requests.post(
        f"{BASE_URL}/api/jobs/{job_id}/transcript",
        headers={**AUTH, "Content-Type": "application/json"},
        json=payload,
        timeout=120,
    )
    response.raise_for_status()


def main() -> None:
    print(f"loading faster-whisper '{MODEL_SIZE}' on {DEVICE} ({COMPUTE_TYPE})…")
    model = WhisperModel(MODEL_SIZE, device=DEVICE, compute_type=COMPUTE_TYPE)
    print(f"watching {BASE_URL} for jobs. ctrl-c to stop.")

    while True:
        try:
            job = claim()
        except requests.RequestException as error:
            print(f"  could not reach the deployment: {error}")
            time.sleep(POLL_SECONDS)
            continue

        if not job:
            time.sleep(POLL_SECONDS)
            continue

        job_id = job["id"]
        print(f"→ job {job_id}")
        path = None
        try:
            path = download(job["videoUrl"])
            payload = transcribe(model, path)
            if not payload["full_text"]:
                print("  no speech found; leaving the job for a retry")
                continue
            submit(job_id, payload)
            print(f"  done — {len(payload['segments'])} segments, {payload['language']}")
        except Exception as error:  # noqa: BLE001 — a worker should outlive one bad job
            print(f"  failed: {error}")
        finally:
            if path and os.path.exists(path):
                os.unlink(path)


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\nstopped.")
