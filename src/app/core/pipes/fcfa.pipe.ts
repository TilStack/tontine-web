import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'fcfa', standalone: true })
export class FcfaPipe implements PipeTransform {
  private readonly formatter = new Intl.NumberFormat('fr-FR', {
    maximumFractionDigits: 0,
    useGrouping: true,
  });

  transform(value: number | null | undefined): string {
    if (value == null) return '— FCFA';
    const abs = this.formatter.format(Math.abs(value));
    const prefix = value < 0 ? '-' : '';
    return `${prefix}${abs} FCFA`;
  }
}
