type Props = {
  saved: boolean;
  label: string;
  onToggle: () => void;
};

export function FavouriteButton({ saved, label, onToggle }: Props) {
  return (
    <button
      type="button"
      className={saved ? "fav on" : "fav"}
      aria-pressed={saved}
      aria-label={saved ? `Remove ${label} from favourites` : `Save ${label} to favourites`}
      onClick={(event) => {
        event.stopPropagation();
        onToggle();
      }}
    >
      <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
        {saved ? (
          <path
            fill="currentColor"
            d="M12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"
          />
        ) : (
          <path
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinejoin="round"
            d="M12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"
          />
        )}
      </svg>
    </button>
  );
}
