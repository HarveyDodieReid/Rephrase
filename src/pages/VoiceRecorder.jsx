/**
 * VoiceRecorder — invisible background component.
 *
 * Runs inside the hidden main BrowserWindow.  No visible UI.
 * Listens for voice-start / voice-stop IPC events from main,
 * records the microphone, sends audio to main for transcription,
 * then pastes the result via insert-text.
 */
import { useEffect, useRef } from 'react'

const MIN_RECORDING_MS = 700

export default function VoiceRecorder() {
  const mediaRecorderRef = useRef(null)
  const chunksRef        = useRef([])
  const isRecordingRef   = useRef(false)
  const pendingStopRef   = useRef(false)
  const recordingStartRef = useRef(0)
  const minDurationTimerRef = useRef(null)
  const streamRef        = useRef(null)
  const audioCtxRef      = useRef(null)

  useEffect(() => {
    const stopVoiceStart = window.electronAPI?.onVoiceStart(async () => {
      console.log('[VoiceRecorder] voice-start received, already recording:', isRecordingRef.current)
      if (isRecordingRef.current) return
      isRecordingRef.current = true
      pendingStopRef.current = false
      chunksRef.current = []
      recordingStartRef.current = Date.now()

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
        console.log('[VoiceRecorder] mic stream acquired')

        const audioCtx = new AudioContext()
        audioCtxRef.current = audioCtx
        audioCtx.createMediaStreamSource(stream)

        const mr = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' })
        mediaRecorderRef.current = mr
        mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data) }

        mr.onstop = async () => {
          streamRef.current?.getTracks().forEach(t => t.stop())
          streamRef.current = null
          audioCtxRef.current?.close().catch(() => {})
          audioCtxRef.current = null

          console.log('[VoiceRecorder] MediaRecorder stopped, chunks:', chunksRef.current.length)
          if (chunksRef.current.length === 0) return

          const blob   = new Blob(chunksRef.current, { type: 'audio/webm' })
          const buffer = await blob.arrayBuffer()
          const copy   = buffer.slice(0)
          console.log('[VoiceRecorder] sending audio to transcribe, bytes:', copy.byteLength)

          const result = await window.electronAPI?.transcribeAudio(copy)
          console.log('[VoiceRecorder] transcribe result:', result?.ok, result?.error)

          if (result?.ok && result.insert !== false && result.text?.trim()) {
            await window.electronAPI?.insertText(result.text.trim())
          }
        }

        mr.start(100)
        console.log('[VoiceRecorder] recording started')

        if (pendingStopRef.current) {
          console.log('[VoiceRecorder] voice-stop arrived during setup, stopping now')
          pendingStopRef.current = false
          isRecordingRef.current = false
          mr.stop()
        }
      } catch (err) {
        console.error('[VoiceRecorder] mic open failed:', err)
        isRecordingRef.current = false
      }
    })

    const stopVoiceStop = window.electronAPI?.onVoiceStop(() => {
      console.log('[VoiceRecorder] voice-stop received, mr state:', mediaRecorderRef.current?.state)
      const mr = mediaRecorderRef.current
      const elapsed = Date.now() - recordingStartRef.current

      const doStop = () => {
        if (minDurationTimerRef.current) {
          clearTimeout(minDurationTimerRef.current)
          minDurationTimerRef.current = null
        }
        isRecordingRef.current = false
        if (mr && mr.state !== 'inactive') mr.stop()
        else pendingStopRef.current = true
      }

      if (elapsed >= MIN_RECORDING_MS) {
        doStop()
      } else {
        const wait = MIN_RECORDING_MS - elapsed
        minDurationTimerRef.current = setTimeout(doStop, wait)
      }
    })

    return () => {
      if (minDurationTimerRef.current) clearTimeout(minDurationTimerRef.current)
      stopVoiceStart?.()
      stopVoiceStop?.()
      streamRef.current?.getTracks().forEach(t => t.stop())
      audioCtxRef.current?.close().catch(() => {})
    }
  }, [])  // eslint-disable-line

  return null
}
