interface AvatarProps {
  name: string;
  color: string;
  size?: number;
}

export function Avatar({ name, color, size = 32 }: AvatarProps) {
  const initials = name
    .split(" ")
    .map(w => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div
      className="avatar"
      style={{
        width: size,
        height: size,
        background: color,
        fontSize: size * 0.32,
      }}
    >
      {initials}
    </div>
  );
}
