type Props = {
  onNext: () => void;
  onBack: () => void;
};

export default function InviteScreen({ onNext, onBack }: Props) {
  return (
    <section style={{ padding: "40px" }}>
      <h1>Invite Screen</h1>
      <p>you’re invited</p>
      <p>RSVP</p>

      <div style={{ display: "flex", gap: "12px", marginTop: "20px" }}>
        <button onClick={onBack}>Back</button>
        <button onClick={onNext}>Continue</button>
      </div>
    </section>
  );
}