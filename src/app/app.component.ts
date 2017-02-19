import { Component, Sanitizer } from '@angular/core';
import { MetaService } from 'ng2-meta';
import { Router, Event, ActivatedRoute } from '@angular/router';
import { MdIconRegistry } from '@angular/material';
import { DomSanitizer } from '@angular/platform-browser';

declare const ga: any;
/**
 * This class represents the main application component.
 */
@Component({
  selector: 'sd-app',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss']
})
export class AppComponent {
  private currentRoute: string = '';

  constructor(
    private router: Router,
    private activatedRoute: ActivatedRoute,
    private metaService: MetaService,
    private mdIconRegistry: MdIconRegistry,
    protected sanitizer: DomSanitizer
  ) {
    activatedRoute.fragment
      .filter((fragment: string) => typeof fragment !== 'undefined')
      .filter((fragment: string) => fragment !== null)
      .subscribe((fragment: any) => {
        if (fragment.indexOf('!') === 0) {
          router.navigate([fragment.substr(1)]);
        }
      });

    router.events.subscribe((event: Event) => {
      let newRoute = event.url || '/';
      if (newRoute !== this.currentRoute) {
        ga('send', 'pageview', newRoute);
        this.currentRoute = newRoute;
      }
    });
  }
}
