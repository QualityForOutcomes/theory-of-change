import { useEffect, useState } from "react";
import { fetchTerms } from "../services/api";

export default function TermsPage() {
  const [terms, setTerms] = useState<string>("");

  useEffect(() => {
    fetchTerms().then((data) => setTerms(data.content));
  }, []);

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Terms and Conditions</h1>
      <pre className="whitespace-pre-wrap">{terms}</pre>
    </div>
  );
}
