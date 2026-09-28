/* Structured data for search engines. `<` is escaped so a string in the data
   can never close the script tag early. */
export default function JsonLd({ data }) {
  const json = JSON.stringify(data).replace(/</g, '\\u003c');
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />;
}
