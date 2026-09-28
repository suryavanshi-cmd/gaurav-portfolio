/* Small shared helpers, kept apart from the content files so client components
   can use them without pulling every post and project into the bundle. */

export const formatDate = (iso) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC',
  });

export const KINDS = {
  work: { label: 'Work', badge: 'badge-work', blurb: 'Built at a job.' },
  built: { label: 'Built', badge: 'badge-built', blurb: 'Built on my own.' },
  design: { label: 'Design', badge: 'badge-design', blurb: 'Worked out on paper. Not shipped.' },
};
