import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Icon, type IconName } from './Icon';

type Variante = 'primaer' | 'tint' | 'flach' | 'gefahr';

export function Button({ variante = 'primaer', gross, icon, children, className = '', ...rest }: {
  variante?: Variante; gross?: boolean; icon?: IconName; children?: ReactNode;
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button type="button" className={`knopf knopf--${variante}${gross ? ' knopf--gross' : ''} ${className}`} {...rest}>
      {icon ? <Icon name={icon} size={gross ? 22 : 20} /> : null}
      {children ? <span>{children}</span> : null}
    </button>
  );
}
