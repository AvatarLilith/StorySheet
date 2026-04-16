type Props = {
  onNext: () => void;
  onBack: () => void;
};

export default function InstructionsScreen({ onNext, onBack }: Props) {
  return (
    <section style={{ padding: "40px" }}>
      <h1>Instructions</h1>
      <p>Open Instagram.</p>
      <p>Go to your Archive.</p>
      <p>Screenshot images that mean something to you.</p>
      <p>Come back here when you’re done.</p>

      <div style={{ display: "flex", gap: "12px", marginTop: "20px" }}>
        <button onClick={onBack}>Back</button>
        <button onClick={onNext}>I’m done</button>
      </div>
    </section>
  );
}