import { useCallback, useEffect, useRef, useState } from 'react'
import { X, UploadCloud, ZoomIn, ZoomOut, RefreshCw } from 'lucide-react'
import toast from 'react-hot-toast'
import { userAPI } from '../../services/api'
import './AvatarCropModal.css'

const VIEW = 300 // crop viewport (px) shown in the modal
const OUT = 400 // exported square size (px) — matches the backend's 400×400
const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp']
const MAX_BYTES = 5 * 1024 * 1024 // 5MB, mirrors the server limit

/**
 * Custom avatar picker + circular cropper. Two states inside one modal:
 *   1) no image  → drop zone / file picker
 *   2) image set → pan (drag) + zoom (slider) over a circular mask, then upload
 *
 * The crop is rendered live via CSS transforms and re-derived onto an offscreen
 * canvas at save time, so what you see is exactly what gets uploaded. No
 * external cropping dependency.
 */
export default function AvatarCropModal({ open, onClose, onUploaded }) {
  const [imageSrc, setImageSrc] = useState(null)
  const [zoom, setZoom] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [uploading, setUploading] = useState(false)

  const imgRef = useRef(null)
  const natRef = useRef({ w: 0, h: 0 }) // natural image dimensions
  const dragRef = useRef(null) // { startX, startY, baseX, baseY }
  const fileInputRef = useRef(null)

  // Cover-fit scale: smallest scale that fills the viewport in both axes.
  const baseScale = (() => {
    const { w, h } = natRef.current
    if (!w || !h) return 1
    return Math.max(VIEW / w, VIEW / h)
  })()

  const clamp = useCallback((next, z) => {
    const { w, h } = natRef.current
    const dispW = w * baseScale * z
    const dispH = h * baseScale * z
    const maxX = Math.max(0, dispW / 2 - VIEW / 2)
    const maxY = Math.max(0, dispH / 2 - VIEW / 2)
    return {
      x: Math.min(maxX, Math.max(-maxX, next.x)),
      y: Math.min(maxY, Math.max(-maxY, next.y)),
    }
  }, [baseScale])

  // Reset transient state whenever the modal closes, and revoke the object URL.
  useEffect(() => {
    if (!open) {
      setImageSrc((prev) => {
        if (prev) URL.revokeObjectURL(prev)
        return null
      })
      setZoom(1)
      setOffset({ x: 0, y: 0 })
      setUploading(false)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (e) => { if (e.key === 'Escape' && !uploading) onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, uploading, onClose])

  const acceptFile = (file) => {
    if (!file) return
    if (!ACCEPTED.includes(file.type)) {
      toast.error('Use a JPEG, PNG, or WebP image.')
      return
    }
    if (file.size > MAX_BYTES) {
      toast.error('Image must be under 5MB.')
      return
    }
    setImageSrc((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return URL.createObjectURL(file)
    })
    setZoom(1)
    setOffset({ x: 0, y: 0 })
  }

  const onImgLoad = (e) => {
    natRef.current = { w: e.target.naturalWidth, h: e.target.naturalHeight }
    setOffset({ x: 0, y: 0 })
    setZoom(1)
  }

  // ── Pan (pointer drag) ──────────────────────────────────────────────
  const onPointerDown = (e) => {
    if (!imageSrc) return
    e.currentTarget.setPointerCapture?.(e.pointerId)
    dragRef.current = { startX: e.clientX, startY: e.clientY, baseX: offset.x, baseY: offset.y }
  }
  const onPointerMove = (e) => {
    if (!dragRef.current) return
    const dx = e.clientX - dragRef.current.startX
    const dy = e.clientY - dragRef.current.startY
    setOffset(clamp({ x: dragRef.current.baseX + dx, y: dragRef.current.baseY + dy }, zoom))
  }
  const onPointerUp = () => { dragRef.current = null }

  const onZoomChange = (e) => {
    const z = Number(e.target.value)
    setZoom(z)
    setOffset((o) => clamp(o, z))
  }

  // ── Export & upload ─────────────────────────────────────────────────
  const handleSave = async () => {
    const img = imgRef.current
    const { w, h } = natRef.current
    if (!img || !w || !h) return

    const dispW = w * baseScale * zoom
    const dispH = h * baseScale * zoom
    // Top-left of the natural image within the viewport, then scaled to OUT.
    const vx0 = VIEW / 2 + offset.x - dispW / 2
    const vy0 = VIEW / 2 + offset.y - dispH / 2
    const s = OUT / VIEW

    const canvas = document.createElement('canvas')
    canvas.width = OUT
    canvas.height = OUT
    const ctx = canvas.getContext('2d')
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(img, vx0 * s, vy0 * s, dispW * s, dispH * s)

    const blob = await new Promise((res) => canvas.toBlob(res, 'image/jpeg', 0.92))
    if (!blob) {
      toast.error('Could not process the image. Try another.')
      return
    }

    const formData = new FormData()
    formData.append('file', blob, 'avatar.jpg')

    setUploading(true)
    try {
      const res = await userAPI.uploadProfilePicture(formData)
      const url = res?.data?.profilePicture
      toast.success('Profile photo updated!')
      onUploaded?.(url)
      onClose()
    } catch (err) {
      toast.error(err?.message || 'Upload failed. Try again.')
    } finally {
      setUploading(false)
    }
  }

  if (!open) return null

  const dispW = natRef.current.w * baseScale * zoom
  const dispH = natRef.current.h * baseScale * zoom

  return (
    <div className="avatar-modal-overlay" onClick={() => !uploading && onClose()}>
      <div className="avatar-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="avatar-modal-header">
          <h3>Update profile photo</h3>
          <button className="avatar-modal-close" onClick={onClose} disabled={uploading} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="avatar-modal-body">
          {!imageSrc ? (
            <div
              className="avatar-dropzone"
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault() }}
              onDrop={(e) => { e.preventDefault(); acceptFile(e.dataTransfer.files?.[0]) }}
            >
              <div className="avatar-dropzone-ico"><UploadCloud size={26} /></div>
              <p className="avatar-dropzone-title">Drop an image here or <span>browse</span></p>
              <p className="avatar-dropzone-hint">JPEG, PNG or WebP · up to 5MB</p>
            </div>
          ) : (
            <>
              <div
                className="avatar-crop-stage"
                style={{ width: VIEW, height: VIEW }}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerLeave={onPointerUp}
              >
                <img
                  ref={imgRef}
                  src={imageSrc}
                  alt="Crop preview"
                  draggable={false}
                  onLoad={onImgLoad}
                  style={{
                    width: dispW || 'auto',
                    height: dispH || 'auto',
                    transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px))`,
                  }}
                />
                <div className="avatar-crop-mask" />
              </div>

              <div className="avatar-zoom-row">
                <ZoomOut size={16} />
                <input
                  type="range"
                  min="1"
                  max="3"
                  step="0.01"
                  value={zoom}
                  onChange={onZoomChange}
                  aria-label="Zoom"
                />
                <ZoomIn size={16} />
              </div>

              <button className="avatar-rechoose" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                <RefreshCw size={13} /> Choose a different photo
              </button>
            </>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            hidden
            onChange={(e) => { acceptFile(e.target.files?.[0]); e.target.value = '' }}
          />
        </div>

        <div className="avatar-modal-footer">
          <button className="btn btn-secondary" onClick={onClose} disabled={uploading}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={!imageSrc || uploading}>
            {uploading ? 'Uploading…' : 'Save photo'}
          </button>
        </div>
      </div>
    </div>
  )
}
