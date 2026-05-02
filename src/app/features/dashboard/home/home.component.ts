import { Component } from '@angular/core';

@Component({
  selector: 'app-home',
  standalone: true,
  template: `
    <h2>Tableau de bord</h2>
    <p>Les modules cotisations, cycles et caisse seront disponibles ici.</p>
  `,
})
export class HomeComponent {}
