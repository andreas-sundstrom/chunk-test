import { ChangeEvent, useRef, useState } from "react";
type ListFileType = {
  index: number;
  name: string;
  size: number;
  uploaded: number;
  completed: boolean;
};

/**
 * Display a single file and its progress
 * @param file {ListFileType} The file to be displayed
 * @returns
 */
const FileItem = (file: ListFileType) => {
  return (
    <>
      {file.name}: {file.uploaded}/{file.size}
    </>
  );
};

/**
 * Simple progress bar
 * @param progress {number} The current progress of upload
 * @param total {number} The total number to be completed
 * @returns
 */
const ProgressBar = ({
  progress,
  total,
}: {
  progress: number;
  total: number;
}) => {
  const width = (progress / total) * 100;
  return (
    <div style={{ height: "1em", width: "100%" }}>
      <p
        style={{
          margin: 0,
          width: "100%",
          textAlign: "center",
          color: "whitesmoke",
          position: "absolute",
        }}
      >
        {progress}/{total}
      </p>
      <div
        style={{
          backgroundColor: "blue",
          height: "100%",
          width: `${width}%`,
        }}
      ></div>
    </div>
  );
};

/**
 * Main upload component
 */
export function Upload() {
  const [files, setFiles] = useState<ListFileType[] | null>(null);
  const [uploading, setUploading] = useState<boolean>(false);
  const inputRef = useRef<HTMLInputElement>(null);

  /**
   * Invoked when user selects files or clicks the cancel button
   * on file selection
   */
  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const length = event.target.files?.length ?? 0;

    // If user doesn't select any files
    if (length === 0) {
      setFiles(null);
      return;
    }

    // Loop through the selected files
    const tempFiles: ListFileType[] = [];
    for (let i = 0; i < length; i++) {
      const file = event.target.files?.item(i);
      if (file !== null && file !== undefined) {
        tempFiles.push({
          index: i,
          name: file.name,
          size: file.size,
          uploaded: 0,
          completed: false,
        });
      }
    }

    // Set state
    setFiles(tempFiles);
  };

  /**
   * Invoke start of upload of file. Will continue to the end of the filelist.
   * @param index {number} The index of the file to be uploaded
   * @returns
   */
  const handleUploadStart = (index: number) => {
    if (files === null) {
      return;
    }

    // Get a unique name for the current file to be uploaded
    fetch(`/api/v1/files?originalFilename=${files[index].name}`, {
      method: "GET",
    })
      .then((res) => res.text())
      .then((filename: string) => {
        // Start uploading the file
        uploadFile(index, filename);
      });
  };

  const uploadFile = (index: number, filename: string) => {
    if (files === null) {
      return;
    }
    setUploading(true);

    const file = inputRef.current?.files?.item(index);
    if (file == undefined || file == null) {
      throw new Error("Failed to read file 1");
    }

    const CHUNK_SIZE = 1000;

    let start = 0;

    const readNextChunk = () => {
      const end = Math.min(start + CHUNK_SIZE, file.size);
      // Slice the input file to a chunk
      const chunk = file?.slice(start, end);

      if (chunk === undefined) {
        throw new Error("Failed to read chunk");
      }

      // Create a reader and add eventlistener to handle finish reading
      const reader = new FileReader();
      reader.addEventListener("load", (ev) => {
        const body = ev.target?.result as ArrayBuffer;
        const form = new FormData();
        form.append("file", new Blob([body]));
        fetch(`/api/v1/files?filename=${filename}`, {
          method: "POST",
          body: form,
        })
          .then(() => {
            setFiles((prev) => {
              if (prev === null) {
                return null;
              }
              const current = prev[index];
              const copy = [...prev];
              copy[index] = current;
              current.uploaded = end;
              return copy;
            });
            if (end < file.size) {
              start = end;
              // Not completed, recursively call the
              // readNextChunk function
              readNextChunk();
            } else {
              // Current file is completed, update state
              setFiles((prev) => {
                if (prev === null) {
                  return null;
                }
                const current = prev[index];
                const copy = [...prev];
                copy[index] = current;
                current.completed = true;
                return copy;
              });

              // If any remaining files, continue with next
              if (files.length > index + 1) {
                handleUploadStart(index + 1);
              } else {
                setUploading(false);
              }
            }
          })
          .catch((err) => {
            console.log(err);
          });
      });

      // Read the current chunk, will invoke the reader above when completed
      reader.readAsArrayBuffer(chunk);
    };

    // Start reading chunks for current file
    readNextChunk();
  };

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        multiple
        onChange={(event) => handleFileChange(event)}
      />
      {files !== null && (
        <button disabled={uploading} onClick={() => handleUploadStart(0)}>
          Upload
        </button>
      )}
      <hr />
      {files && (
        <div>
          {files.map((v, i) => (
            <div key={i}>
              <FileItem
                index={i}
                name={v.name}
                size={v.size}
                uploaded={v.uploaded}
                completed={v.completed}
              />
              <ProgressBar progress={v.uploaded} total={v.size} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
