type Props = {
  files: File[];
  setFiles: React.Dispatch<React.SetStateAction<File[]>>;
  onNext: () => void;
  onBack: () => void;
};

export default function UploadScreen({
  files,
  setFiles,
  onNext,
  onBack,
}: Props) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []);
    setFiles(selected);
  };

  return (
    <section style={{ padding: "40px" }}>
      <h1>Upload</h1>
      <p>Add your Instagram screenshots here.</p>

      <input type="file" accept="image/*" multiple onChange={handleChange} />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, 120px)",
          gap: "12px",
          marginTop: "20px",
        }}
      >
        {files.map((file, index) => (
          <img
            key={index}
            src={URL.createObjectURL(file)}
            alt={file.name}
            style={{
              width: "120px",
              height: "120px",
              objectFit: "cover",
              border: "1px solid #ccc",
            }}
          />
        ))}
      </div>

      <div style={{ display: "flex", gap: "12px", marginTop: "20px" }}>
        <button onClick={onBack}>Back</button>
        <button onClick={onNext}>Continue</button>
      </div>
    </section>
  );
}