export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-8 py-16 text-center">
      <div className="flex flex-col gap-3">
        <h1 className="text-3xl font-bold leading-tight text-ink">
          Покликати на побачення —<br />
          без зайвого листування
        </h1>
        <p className="text-base leading-relaxed text-muted">
          Обери кілька варіантів часу і місця, додай кілька слів — і скинь
          посилання. Друга людина просто обере, що їй підходить.
        </p>
      </div>

      <button
        type="button"
        className="w-full rounded-2xl bg-brand py-4 text-base font-semibold text-white"
      >
        Створити запрошення
      </button>

      <p className="text-xs text-quiet">Без реєстрації — потрібне лише посилання</p>
    </main>
  );
}
