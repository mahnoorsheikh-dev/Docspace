export default function LoadingOverlay({ title, detail }) {
  return (
    <div className="import-overlay" role="status" aria-live="polite">
      <div className="import-card">
        <span className="spinner" />
        <strong>{title}</strong>
        <small>{detail}</small>
      </div>
    </div>
  )
}
