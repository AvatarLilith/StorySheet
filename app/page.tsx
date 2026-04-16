"use client";

import { useState } from "react";
import IntroScreen from "../components/IntroScreen";

export default function HomePage() {
  const [step, setStep] = useState(0);

  const next = () => setStep((prev) => prev + 1);

  return (
    <main>
      {step === 0 && <IntroScreen onNext={next} />}
    </main>
  );
}