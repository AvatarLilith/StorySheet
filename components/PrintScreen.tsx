"use client";

type Props = {
  files: File[];
  letter: string;
  onBack: () => void;
};

export default function PrintScreen({ files, letter, onBack }: Props) {
  const imageUrls = files.map((f) => URL.createObjectURL(f));

  return (
    <section style={{ padding: 20 }}>
      <button onClick={onBack}>Back</button>
      <button onClick={() => window.print()}>Download PDF</button>

      <div className="zine-sheet">
        {/* TOP ROW: 8 1 2 3 */}
        <div className="panel">Back</div>

        <div className="panel">
          <h1>Close Friends Only</h1>
        </div>

        <div className="panel">
          {imageUrls[0] && <img src={imageUrls[0]} />}
        </div>

        <div className="panel">
          {imageUrls[1] && <img src={imageUrls[1]} />}
        </div>

        {/* BOTTOM ROW: 7 6 5 4 */}
        <div className="panel">{letter}</div>

        <div className="panel">
          {imageUrls[3] && <img src={imageUrls[3]} />}
        </div>

        <div className="panel">
          {imageUrls[2] && <img src={imageUrls[2]} />}
        </div>

        <div className="panel">Letter cont.</div>
      </div>
    </section>
  );
}