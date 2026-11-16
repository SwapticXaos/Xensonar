import { useCallback, useRef, useState } from "react";

type RecordingRuntimeOptions = {
  setStatus: (status: string) => void;
};

export function useXensonarRecordingRuntime({ setStatus }: RecordingRuntimeOptions) {
  const recorderDestinationRef = useRef<MediaStreamAudioDestinationNode | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const [recording, setRecording] = useState(false);
  const [recordingUrl, setRecordingUrl] = useState<string | null>(null);

  const toggleReadyRecording = useCallback(() => {
    const dest = recorderDestinationRef.current;
    if (!dest) return;

    if (typeof MediaRecorder === "undefined") {
      setStatus("Recording is not supported in this browser");
      return;
    }

    if (!recording) {
      recordedChunksRef.current = [];
      const recorder = new MediaRecorder(dest.stream);
      mediaRecorderRef.current = recorder;
      recorder.ondataavailable = (ev) => {
        if (ev.data.size > 0) recordedChunksRef.current.push(ev.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: "audio/webm" });
        const url = URL.createObjectURL(blob);
        setRecordingUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return url;
        });
        setStatus("Recording ready");
      };
      recorder.start();
      setRecording(true);
      setStatus("Recording");
      return;
    }

    mediaRecorderRef.current?.stop();
    setRecording(false);
  }, [recording, setStatus]);

  return {
    recorderDestinationRef,
    recording,
    recordingUrl,
    toggleReadyRecording,
  };
}
