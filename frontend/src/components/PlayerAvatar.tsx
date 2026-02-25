import Avatar, { AvatarProps } from '@mui/material/Avatar';

interface PlayerAvatarProps extends Omit<AvatarProps, 'src' | 'alt'> {
  name: string;
  photoUrl?: string;
  size?: number;
}

function initials(name: string): string {
  const parts = name.trim().split(' ');
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

export default function PlayerAvatar({ name, photoUrl, size = 40, sx, ...rest }: PlayerAvatarProps) {
  return (
    <Avatar
      src={photoUrl}
      alt={name}
      sx={{ width: size, height: size, bgcolor: 'primary.main', fontSize: size * 0.4, ...sx }}
      imgProps={{ loading: 'lazy' }}
      {...rest}
    >
      {initials(name)}
    </Avatar>
  );
}
