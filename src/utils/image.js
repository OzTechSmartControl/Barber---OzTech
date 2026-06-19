// Redimensiona e comprime uma imagem no navegador antes do upload.
// Fotos de celular podem chegar a 10-15MB — isso evita o erro 413
// (Payload too large) do Supabase Storage e acelera o upload.
export const compressImage = (file, maxDim = 800, quality = 0.82) =>
  new Promise((resolve) => {
    const skip = !file || !file.type.startsWith("image/") || file.type === "image/gif" || file.type === "image/svg+xml";
    if (skip) {
      resolve(file);
      return;
    }

    const url = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(url);

      let { width, height } = img;
      if (width > maxDim || height > maxDim) {
        if (width > height) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      canvas.getContext("2d").drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (!blob) { resolve(file); return; }
          const newName = file.name.replace(/\.\w+$/, "") + ".jpg";
          resolve(new File([blob], newName, { type: "image/jpeg" }));
        },
        "image/jpeg",
        quality
      );
    };

    img.onerror = () => { URL.revokeObjectURL(url); resolve(file); };
    img.src = url;
  });
