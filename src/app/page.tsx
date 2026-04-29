// Friendly fallback shown when someone visits the bare domain without a token.
// The real action happens at /<64-hex-token>.
export default function Home() {
  return (
    <main className="mx-auto max-w-md p-6 pt-16 text-center">
      <div className="text-5xl mb-4" aria-hidden>📸</div>
      <h1 className="text-2xl font-semibold mb-2">Social Posts</h1>
      <p className="text-neutral-600">
        Diese Seite öffnest du über den Magic-Link in deiner E-Mail.
        Schau in dein Postfach für den Link zur nächsten geplanten Story.
      </p>
    </main>
  );
}
