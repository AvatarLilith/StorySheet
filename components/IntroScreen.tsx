type Props = {
  onNext: () => void;
};

export default function IntroScreen({ onNext }: Props) {
  return (
    <section>
      <h1>Close Friends Only</h1>

      <p>Tools required:</p>
      <ol>
        <li>A printer</li>
        <li>Instagram</li>
        <li>An envelope</li>
        <li>A stamp</li>
      </ol>

      <button onClick={onNext}>Begin</button>
    </section>
  );
}