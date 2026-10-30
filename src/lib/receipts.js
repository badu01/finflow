import { useEffect, useState } from 'react'
import { supabase, hasSupabase } from './supabase'
import { uuid } from './uuid'

// Receipts: Supabase Storage when connected, IndexedDB on this device otherwise. Photos are shrunk first.
const DB = 'finflow-receipts', ST = 'files'
const open = () => new Promise((res, rej) => {
  const r = indexedDB.open(DB, 1)
  r.onupgradeneeded = () => r.result.createObjectStore(ST)
  r.onsuccess = () => res(r.result)
  r.onerror = () => rej(r.error)
})
const idb = async (mode, fn) => {
  const db = await open()
  return new Promise((res, rej) => {
    const t = db.transaction(ST, mode)
    const req = fn(t.objectStore(ST))
    t.oncomplete = () => res(req?.result)
    t.onerror = () => rej(t.error)
  })
}

async function shrink(file) {
  if (!file.type.startsWith('image/')) return file
  try {
    const bmp = await createImageBitmap(file)
    const s = Math.min(1, 1600 / Math.max(bmp.width, bmp.height))
    const c = document.createElement('canvas')
    c.width = Math.round(bmp.width * s); c.height = Math.round(bmp.height * s)
    c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height)
    const blob = await new Promise((r) => c.toBlob(r, 'image/jpeg', 0.78))
    return blob && blob.size < file.size ? blob : file
  } catch { return file }
}

export async function saveReceipt(file, userId) {
  const blob = await shrink(file)
  const type = blob.type || file.type || 'image/jpeg'
  if (hasSupabase) {
    const ext = type === 'application/pdf' ? 'pdf' : type === 'image/png' ? 'png' : 'jpg'
    const path = `${userId}/${uuid()}.${ext}`
    const { error } = await supabase.storage.from('receipts').upload(path, blob, { contentType: type })
    if (error) throw error
    return path
  }
  const id = 'local:' + uuid()
  await idb('readwrite', (s) => s.put({ blob, type }, id))
  return id
}

export async function receiptUrl(path) {
  if (path.startsWith('local:')) {
    const rec = await idb('readonly', (s) => s.get(path))
    if (!rec) throw new Error('missing')
    return { url: URL.createObjectURL(rec.blob), type: rec.type, local: true }
  }
  const { data, error } = await supabase.storage.from('receipts').createSignedUrl(path, 3600)
  if (error) throw error
  return { url: data.signedUrl, type: path.endsWith('.pdf') ? 'application/pdf' : 'image/jpeg', local: false }
}

export async function deleteReceipt(path) {
  if (!path) return
  try {
    if (path.startsWith('local:')) await idb('readwrite', (s) => s.delete(path))
    else await supabase.storage.from('receipts').remove([path])
  } catch { /* best effort */ }
}

export function useReceipt(path) {
  const [s, setS] = useState({ url: null, type: '', loading: false, error: false })
  useEffect(() => {
    if (!path) { setS({ url: null, type: '', loading: false, error: false }); return }
    let dead = false, obj = null
    setS((p) => ({ ...p, loading: true, error: false }))
    receiptUrl(path).then((r) => {
      if (dead) { if (r.local) URL.revokeObjectURL(r.url); return }
      obj = r.local ? r.url : null
      setS({ url: r.url, type: r.type, loading: false, error: false })
    }).catch(() => { if (!dead) setS({ url: null, type: '', loading: false, error: true }) })
    return () => { dead = true; if (obj) URL.revokeObjectURL(obj) }
  }, [path])
  return s
}
