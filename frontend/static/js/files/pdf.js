// ------------------------------------------------------------------------------------------------------------
// Converts image blobs into PDF blobs using jsPDF.
// Ensures image fits properly within A4 page.
// ------------------------------------------------------------------------------------------------------------

/**
 * Converts image blob into PDF blob
 * @param {Blob} imageBlob
 * @returns {Promise<Blob>}
 */
export async function imageToPdfBlob(imageBlob) {

    const { jsPDF } = window.jspdf;

    return new Promise((resolve) => {

        const reader = new FileReader();

        reader.onload = function (e) {

            const img = new Image();

            img.onload = function () {

                const pdf = new jsPDF("p", "mm", "a4");

                const pw = pdf.internal.pageSize.getWidth();
                const ph = pdf.internal.pageSize.getHeight();

                const r = img.width / img.height;
                const pr = pw / ph;

                let w, h;

                if (r > pr) {
                    w = pw;
                    h = pw / r;
                } else {
                    h = ph;
                    w = ph * r;
                }

                pdf.addImage(img, "PNG", (pw - w) / 2, (ph - h) / 2, w, h);

                resolve(pdf.output("blob"));
            };

            img.src = e.target.result;
        };

        reader.readAsDataURL(imageBlob);
    });
}