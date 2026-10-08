/** A multiple-choice question for the Quiz tab and unit tests. */
export interface MCQ {
  /** Stable id, unique within its topic, e.g. "q1" */
  id: string;
  question: string;
  options: string[];
  /** Index into `options` of the correct answer */
  answer: number;
  /** Why the answer is right, in one or two simple sentences */
  explanation: string;
}

/** A likely viva or exam question with a short model answer. */
export interface VivaItem {
  q: string;
  a: string;
}

export interface ObservationColumn {
  key: string;
  label: string;
  /** Unit shown in the column header, e.g. "ms" */
  unit?: string;
}

/** Everything a printable lab record needs besides the student's own run. */
export interface LabRecordDef {
  /** Software / apparatus list */
  apparatus: string[];
  /** Short theory for the record, 3–6 sentences */
  theory: string;
  procedure: string[];
  observationColumns: ObservationColumn[];
  /** Shown in the result box when the student hasn't written a result yet */
  resultHint: string;
  viva: VivaItem[];
}

export type ObservationRow = Record<string, string | number>;
