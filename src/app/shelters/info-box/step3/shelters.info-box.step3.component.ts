import { Component } from '@angular/core';
import { SheltersUserStateService } from '../../user-state/shelters.user-state.service';
import { SheltersInfoBoxComponent } from '../shelters.info-box.component';
import { Router } from '@angular/router';

/**
 * This class represents the lazy loaded HomeComponent.
 */
@Component({
  templateUrl: 'shelters.info-box.step3.component.html',
})

export class SheltersInfoBoxStep3Component extends SheltersInfoBoxComponent {

  constructor(
    router: Router,
    private sheltersUserStateService: SheltersUserStateService,
  ) {
    super(router);
    this.sheltersUserStateService.setCurrentStep(3);
  }
}
