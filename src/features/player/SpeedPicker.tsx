import { useState } from "react";
import { SegmentedControl, type SegmentItem } from "../../ui";
import { setRate } from "./store";

const RATES = [0.5, 0.75, 1, 1.25, 1.5, 2] as const;

type RateValue = `${(typeof RATES)[number]}`;

const ITEMS: SegmentItem<RateValue>[] = RATES.map((rate) => ({
  value: String(rate) as RateValue,
  label: `${rate}×`,
}));

type Props = {
  initialRate?: number;
};

export function SpeedPicker({ initialRate = 1 }: Props) {
  const [value, setValue] = useState<RateValue>(String(initialRate) as RateValue);

  const onChange = (next: RateValue) => {
    setValue(next);
    setRate(Number(next));
  };

  return <SegmentedControl value={value} items={ITEMS} onChange={onChange} />;
}
