type Props = {
  letter: string;
  setLetter: React.Dispatch<React.SetStateAction<string>>;
  onNext: () => void;
  onBack: () => void;
};

export default function LetterScreen({
  letter,
  setLetter,
  onNext,
  onBack,
}: Props) {
  return (
    <section style={{ padding: "40px" }}>
      <h1>Write your letter</h1>
      <p>Add a message to your close friend.</p>

      <textarea
        value={letter}
        onChange={(e) => setLetter(e.target.value)}
        placeholder="Write here..."
        style={{
          width: "100%",
          minHeight: "220px",
          marginTop: "16px",
          padding: "12px",
        }}
      />

      <div style={{ display: "flex", gap: "12px", marginTop: "20px" }}>
        <button onClick={onBack}>Back</button>
        <button onClick={onNext}>Continue</button>
      </div>
    </section>
  );
}