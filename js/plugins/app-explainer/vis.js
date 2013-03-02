/**
 * Visualization Overview:
 *
 * Display a vertical timeline (because that's how my=asuth's monitors roll),
 * with a wide horizontal gutter where x-offsets ranges are allocated to various
 * components/processes.  Textual descriptions and details happen in a big space
 * off to the right.
 *
 * Overview gutters:
 * - JS on stack
 * - layout activity: synchronous versus deferred flush distinguished
 *     (layout::Flush (*))
 * - painting (Paint::PresShell::Paint)
 * - blocking (futex)
 * - idle (nsAppShell::ProcessNextNativeEvent::Wait, holds syscall)
 * - timer (Timer::Fire)
 * - DOM event
 * - network (network::nsStreamLoader::OnStopRequest is innermost,
 *     Input::nsInputStreamPump::OnInputStreamReady is outermost)
 *
 */
