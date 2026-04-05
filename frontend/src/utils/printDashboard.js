import html2canvas from "html2canvas"
import { jsPDF } from "jspdf"

function slugFileName(name) {
  const s = String(name || "dashboard")
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, "")
    .trim()
    .replace(/\s+/g, "-")
  return (s || "dashboard").slice(0, 96)
}

/** Match main column max width so PDF matches on-screen layout (not a “mobile” capture). */
const CAPTURE_MIN_WIDTH = 1140

/**
 * Rasterizes #pdf-clean-dashboards and saves a single-page A4 PDF (no print dialog).
 * Hides .no-print and shows .print-only in the capture clone.
 */
export async function downloadDashboardPdf(options = {}) {
  const { elementId = "pdf-clean-dashboards", fileName = "Talking-BI-report" } = options
  const el = document.getElementById(elementId)
  if (!el) return false

  await document.fonts?.ready?.catch?.(() => {})

  const captureWidth = Math.max(CAPTURE_MIN_WIDTH, el.scrollWidth, el.offsetWidth, el.getBoundingClientRect().width)

  const canvas = await html2canvas(el, {
    scale: 2,
    useCORS: true,
    logging: false,
    backgroundColor: "#ffffff",
    // FO rendering can mis-measure SVG/Recharts in some browsers
    foreignObjectRendering: false,
    // Critical: html2canvas defaults to a small iframe width → responsive grids collapse to a narrow strip
    windowWidth: captureWidth,
    windowHeight: Math.min(Math.max(el.scrollHeight + 120, 900), 16000),
    onclone: (clonedDoc, cloneRoot) => {
      const root = cloneRoot || clonedDoc.getElementById(elementId)
      if (!root) return

      root.style.setProperty("width", `${captureWidth}px`, "important")
      root.style.setProperty("min-width", `${captureWidth}px`, "important")
      root.style.setProperty("max-width", "none", "important")
      root.style.setProperty("box-sizing", "border-box", "important")

      const html = clonedDoc.documentElement
      const body = clonedDoc.body
      if (html) {
        html.style.setProperty("width", `${captureWidth}px`, "important")
        html.style.setProperty("min-width", `${captureWidth}px`, "important")
        html.style.setProperty("overflow", "visible", "important")
      }
      if (body) {
        body.style.setProperty("width", `${captureWidth}px`, "important")
        body.style.setProperty("min-width", `${captureWidth}px`, "important")
        body.style.setProperty("margin", "0", "important")
        body.style.setProperty("padding", "0", "important")
      }

      root.querySelectorAll(".no-print").forEach((node) => {
        node.style.setProperty("display", "none", "important")
      })
      root.querySelectorAll(".print-only").forEach((node) => {
        node.style.setProperty("display", "block", "important")
      })
    },
  })

  const imgData = canvas.toDataURL("image/jpeg", 0.9)
  const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait", compress: true })
  const pageW = pdf.internal.pageSize.getWidth()
  const pageH = pdf.internal.pageSize.getHeight()
  const margin = 8
  const maxW = pageW - 2 * margin
  const maxH = pageH - 2 * margin

  const props = pdf.getImageProperties(imgData)
  const iw = props.width
  const ih = props.height
  if (!iw || !ih) return false

  const imgAspect = iw / ih
  const boxAspect = maxW / maxH
  let finalW
  let finalH
  if (imgAspect > boxAspect) {
    finalW = maxW
    finalH = maxW / imgAspect
  } else {
    finalH = maxH
    finalW = maxH * imgAspect
  }
  const x = (pageW - finalW) / 2
  const y = margin + (maxH - finalH) / 2

  pdf.addImage(imgData, "JPEG", x, y, finalW, finalH, undefined, "FAST")
  pdf.save(`${slugFileName(fileName)}.pdf`)
  return true
}

/** @deprecated Use downloadDashboardPdf — kept for call sites passing `title` */
export async function printCleanDashboard(options = {}) {
  const raw =
    options.fileName ||
    (options.title && String(options.title).replace(/\s*—\s*Talking BI\s*$/i, "").trim()) ||
    "dashboard"
  return downloadDashboardPdf({
    elementId: options.elementId,
    fileName: raw,
  })
}
