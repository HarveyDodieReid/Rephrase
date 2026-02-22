/**
 * VoiceRecorder — invisible background component.
 *
 * Runs inside the hidden main BrowserWindow.  No visible UI.
 * Listens for voice-start / voice-stop IPC events from main,
 * records the microphone, sends audio to main for transcription,
 * then pastes the result via insert-text.
 */
import { useEffect, useRef } from 'react'

export default function VoiceRecorder() {
  const mediaRecorderRef = useRef(null)
  const chunksRef        = useRef([])
  const isRecordingRef   = useRef(false)
  const streamRef        = useRef(null)
  const audioCtxRef      = useRef(null)

  useEffect(() => {
    // ── voice-start → open mic + begin recording ─────────────────────────
    const stopVoiceStart = window.electronAPI?.onVoiceStart(async () => {
      if (isRecordingRef.current) return
      isRecordingRef.current = true
      chunksRef.current = []

      try {
        const settings = await window.electronAPI?.getSettings().catch(() => ({}))
        const deviceId = settings?.micDeviceId && settings.micDeviceId !== 'default'
          ? { exact: settings.micDeviceId }
          : undefined

        const stream = await navigator.mediaDevices.getUserMedia({
          audio: deviceId ? { deviceId } : true,
          video: false,
        })
        streamRef.current = stream

        // Keep AudioContext alive so the microphone track stays active
        const audioCtx = new AudioContext()
        audioCtxRef.current = audioCtx
        audioCtx.createMediaStreamSource(stream)  // connect to keep stream alive

        const mr = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' })
        mediaRecorderRef.current = mr
        mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data) }

        mr.onstop = async () => {
          // Tear down mic / audio context
          streamRef.current?.getTracks().forEach(t => t.stop())
          streamRef.current = null
          audioCtxRef.current?.close().catch(() => {})
          audioCtxRef.current = null

          if (chunksRef.current.length === 0) return

          const blob   = new Blob(chunksRef.current, { type: 'audio/webm' })
          const buffer = await blob.arrayBuffer()

          const result = await window.electronAPI?.transcribeAudio(buffer)

          if (result?.ok && result.insert !== false && result.text?.trim()) {
            await window.electronAPI?.insertText(result.text.trim())
          }
          // Main handles overlay close / error display — nothing else needed here
        }

        mr.start(100)   // emit data every 100 ms
      } catch {
        // Mic access failed — main's safety timeout will close the overlay
        isRecordingRef.current = false
      }
    })

    // ── voice-stop → stop MediaRecorder → onstop fires → audio sent ──────
    const stopVoiceStop = window.electronAPI?.onVoiceStop(() => {
      isRecordingRef.current = false
      const mr = mediaRecorderRef.current
      if (mr && mr.state !== 'inactive') mr.stop()
    })

    return () => {
      stopVoiceStart?.()
      stopVoiceStop?.()
      // Clean up any open mic on unmount
      streamRef.current?.getTracks().forEach(t => t.stop())
      audioCtxRef.current?.close().catch(() => {})
    }
  }, [])  // eslint-disable-line

  return null   // no visible output
}
