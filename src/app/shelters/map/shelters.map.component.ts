import { ApiService } from '../../shared/api/api.service';
import { Component, AfterViewInit } from '@angular/core';
import { SheltersUserStateService } from '../user-state/shelters.user-state.service';
import { BehaviorSubject } from 'rxjs/BehaviorSubject';
import { Shelter } from '../../../models/shelter.model';
import { Hospital } from '../../../models/hospital.model';
import { Position } from '../../../models/position.model';
import { GmapsMarker } from '../../../models/gmaps-marker.model';
import { GmapsMarkerShelter } from '../../../models/gmaps-marker-shelter.model';
import { GmapsMarkerHospital } from '../../../models/gmaps-marker-hospital.model';

declare var google: any;
declare var MarkerClusterer: any;

/**
 * This class represents the lazy loaded HomeComponent.
 */
@Component({

  templateUrl: 'shelters.map.component.html',
  styleUrls: ['shelters.map.component.scss'],
  selector: 'hs-map',
})

export class SheltersMapComponent implements AfterViewInit {
  map: any;
  directionsDisplay: any;
  selectedShelterMarker: GmapsMarkerShelter = null;
  selectedHospitalMarker: GmapsMarkerHospital = null;
  shelterMarkers: GmapsMarkerShelter[] = [];
  hospitalMarkers: GmapsMarkerHospital[] = [];
  markerClusterer: any;

  private sheltersIsPlotted: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
  whenSheltersIsPlotted$ = this.sheltersIsPlotted.asObservable().filter(r => r === true);

  private hospitalsIsPlotted: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
  whenHospitalsIsPlotted$ = this.hospitalsIsPlotted.asObservable().filter(r => r === true);

  constructor(private sheltersUserStateService: SheltersUserStateService,
              apiService: ApiService) {
  }

  ngAfterViewInit() {
    this.loadMap();
    this.sheltersUserStateService.shelters$.subscribe(
      (shelters: Shelter[]) => this.plotShelters(shelters)
    );

    this.sheltersUserStateService.hospitals$.subscribe(
      (hospitals: Hospital[]) => this.plotHospitals(hospitals)
    );

    this.sheltersUserStateService.currentPosition$.subscribe(
      (position: Position) => this.plotCurrentPosition(position)
    );

    this.sheltersUserStateService.selectedShelter$.subscribe(
      (shelter: Shelter) => this.selectShelter(shelter)
    );

    this.sheltersUserStateService.selectedHospital$.subscribe(
      (hospital: Hospital) => this.selectHospital(hospital)
    );
  }

  selectHospital(hospital: Hospital) {
    var _subsc = this.whenSheltersIsPlotted$.subscribe(
      () => {
        for (var i=0;i<this.hospitalMarkers.length;i++) {
          if (this.hospitalMarkers[i].hospital.hsaId === hospital.hsaId) {
            this.clickMarker(this.hospitalMarkers[i]);
            break;
          }
        }
      }).unsubscribe();
  }

  selectShelter(shelter: Shelter) {
    this.whenSheltersIsPlotted$.subscribe(
      () => {
        for (var i=0;i<this.shelterMarkers.length;i++) {
          if (this.shelterMarkers[i].shelter.id === shelter.id) {
            this.clickMarker(this.shelterMarkers[i]);
            break;
          }
        }
      }).unsubscribe();
  }

  selectClosestShelter(origin: Position = null) {
    this.whenSheltersIsPlotted$.subscribe(
      () => this.selectClosestMarker(this.shelterMarkers, origin)
    ).unsubscribe();
  }

  selectClosestHospital(origin: Position = null) {
    this.selectClosestMarker(this.hospitalMarkers, origin);
  }

  private selectClosestMarker(markers: GmapsMarker[], origin: Position = null) {
    let marker: GmapsMarker;

    if (origin !== null) {
      marker = this.findClosestMarker(
        new google.maps.LatLng(origin.lat, origin.long),
        markers);
    } else {
      marker = markers[0];
    }

    this.clickMarker(marker);
  }

  private clickMarker(marker: GmapsMarker) {
    google.maps.event.trigger(marker, 'click');
  }

  private loadMap() {
    this.map = new google.maps.Map(document.getElementById('map'), {
      zoom: 5,
      center: {lat: 60.490, lng: 14.941}
    });

    this.directionsDisplay = new google.maps.DirectionsRenderer();
    this.directionsDisplay.setMap(this.map);
    this.directionsDisplay.setOptions({
      suppressMarkers: true
    });

    this.sheltersUserStateService.setMapAsLoaded();
  }

  private findClosestMarker(origin: any, markerArray: any[]): GmapsMarker {
    let lat = origin.lat();
    let lng = origin.lng();
    let R = 6371; // radius of earth in km
    let distances: any[] = [];
    let closest = -1;

    function rad(x: number) {
      return x * Math.PI / 180;
    }

    for (let i = 0; i < markerArray.length; i++) {
      let mLat = markerArray[i].getPosition().lat();
      let mLng = markerArray[i].getPosition().lng();
      let dLat = rad(mLat - lat);
      let dLong = rad(mLng - lng);
      let a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(rad(lat)) * Math.cos(rad(lat)) * Math.sin(dLong / 2) * Math.sin(dLong / 2);
      let c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      let d = R * c;
      distances[i] = d;
      if (closest === -1 || d < distances[closest]) {
        closest = i;
      }
    }

    return markerArray[closest];
  }

  private findClosestPath(origin: Position, destination: Position, preserveViewport: boolean, travelMode: any) {
    let directionsService = new google.maps.DirectionsService;
    var _shelterComponent = this;

    // If travelMode isnt set, lets set it to WALKING
    if (typeof travelMode === 'undefined') {
      travelMode = google.maps.TravelMode['WALKING'];
    }

    // Prepare request to get the route for the closest route
    let request = {
      origin: new google.maps.LatLng(origin.lat, origin.long),
      destination: new google.maps.LatLng(destination.lat, destination.long),
      travelMode: travelMode,
      optimizeWaypoints: true
    };

    // Request the route
    directionsService.route(request, function (response: any, status: any) {
      /**
       * TODO: Display alert on error
       */
      switch (status) {
        case google.maps.DirectionsStatus.REQUEST_DENIED:
          break;
        case google.maps.DirectionsStatus.UNKNOWN_ERROR:
          break;
        case google.maps.DirectionsStatus.INVALID_REQUEST:
          break;
        case google.maps.DirectionsStatus.OVER_QUERY_LIMIT:
          break;
        case google.maps.DirectionsStatus.ZERO_RESULTS:
          break;
        case google.maps.DirectionsStatus.OK:
          // If we couldn't find a path, lets try with travelMode DRIVING
          // google.maps.TravelMode['DRIVING']

          // Render the direction
          _shelterComponent.directionsDisplay.setOptions({
            preserveViewport: preserveViewport
          });
          _shelterComponent.directionsDisplay.setDirections({routes: []});
          _shelterComponent.directionsDisplay.setDirections(response);
          break;
      }

    });

  };

  private plotCurrentPosition(position: Position) {
    new google.maps.Marker({
      position: new google.maps.LatLng(position.lat, position.long),
      map: this.map,
      type: 'currentPosition',
    });

  }

  private plotShelters(shelters: Shelter[]) {
    this.sheltersIsPlotted.next(false);

    // Collect the shelters that already is marked
    let seenShelters: number[] = [];
    for (let i=0;i<this.shelterMarkers.length;i++) {
      seenShelters.push(this.shelterMarkers[i].shelter.id);
    }

    // Create all the markers
    for (let i = 0; i < shelters.length; i++) {
      if (seenShelters.indexOf(shelters[i].id) !== -1) {
        continue;
      }

      let marker = new google.maps.Marker({
        position: new google.maps.LatLng(shelters[i].position.lat, shelters[i].position.long),
        map: this.map,
        icon: {
          url: '/assets/images/icon-shelter.png',
          scaledSize: new google.maps.Size(30, 30)
        },
        shelter: shelters[i],
        type: 'shelter',
      });

      this.setShelterMarkerEventData(shelters[i], marker);
      this.shelterMarkers.push(marker);
    }

    this.markerClusterer = new MarkerClusterer(this.map, this.shelterMarkers, {
      enableRetinaIcons: false,
      maxZoom: 15,
      imagePath: '/assets/images/icon-shelter-cluster',
      imageExtension: 'png'
    });

    google.maps.event.addListener(this.markerClusterer, 'clusteringbegin', function (markerClusterer: any) {
//      console.log('nu börjar vi!', markerClusterer);
    });

    google.maps.event.addListener(this.markerClusterer, 'clusteringend', function (markerClusterer: any) {
//      console.log('nu slutar vi!', markerClusterer);
    });

    this.sheltersIsPlotted.next(true);
  }

  private plotHospitals(hospitals: Hospital[]) {
    this.hospitalsIsPlotted.next(false);

    // Collect the hospitals that already is marked
    let seenHospitals: any[] = [];
    for (let i=0;i<this.hospitalMarkers.length;i++) {
      seenHospitals.push(this.hospitalMarkers[i].hospital.hsaId);
    }

    for(let i=0;i<hospitals.length;i++) {
      if (seenHospitals.indexOf(hospitals[i].hsaId) !== -1) {
        continue;
      }

      let marker = new google.maps.Marker({
        position: new google.maps.LatLng(hospitals[i].position.lat, hospitals[i].position.long),
        map: this.map,
        icon: {
          url: '/assets/images/icon-hospital.png',
          scaledSize: new google.maps.Size(31, 31)
        },
        hospital: hospitals[i],
        type: 'hospital',
      });

      this.setHospitalMarkerEventData(hospitals[i], marker);
      this.hospitalMarkers.push(marker);
    }

    this.hospitalsIsPlotted.next(true);
  }

  private setSizeOfMarkerAsOriginal(marker: GmapsMarker, type: string) {
    let icon = marker.icon;
    switch (type) {
      case 'shelter':
        icon.scaledSize.width = 29;
        icon.scaledSize.height = 30;
        break;
      case 'hospital':
        icon.scaledSize.width = 31;
        icon.scaledSize.height = 31;
        break;
    }
    marker.setIcon(icon);
  }

  private setSizeOfMarkerAsSelected(marker: GmapsMarker, type: string) {
    let icon = marker.icon;
    switch (type) {
      case 'shelter':
        icon.scaledSize.width = 58;
        icon.scaledSize.height = 60;
        break;
      case 'hospital':
        icon.scaledSize.width = 62;
        icon.scaledSize.height = 62;
        break;
    }
    marker.setIcon(icon);
  }

  private setShelterMarkerEventData(shelter: Shelter, marker: GmapsMarker) {
    var _sheltersMap = this;

    google.maps.event.addListener(marker, 'click', function (event: Event) {

        // If there's a selected shelter, reset the size of it
        if (_sheltersMap.selectedShelterMarker !== null) {
          _sheltersMap.setSizeOfMarkerAsOriginal(_sheltersMap.selectedShelterMarker, 'shelter');
        }

        // Set the new selected shelter
//        _sheltersMap.sheltersUserStateService.selectShelter(shelter);
        _sheltersMap.selectedShelterMarker = this;

        _sheltersMap.setSizeOfMarkerAsSelected(_sheltersMap.selectedShelterMarker, 'shelter');

        _sheltersMap.sheltersUserStateService.currentPosition$.subscribe(
          (position: Position) => {
            // Write path
            _sheltersMap.findClosestPath(
              position,
              this.shelter.position,
              false,
              google.maps.TravelMode['WALKING']
            );
          }).unsubscribe();
      }
    );

  }

  private setHospitalMarkerEventData(hospital: Hospital, marker: GmapsMarker) {
    let _sheltersMap = this;

    google.maps.event.addListener(marker, 'click', function(event: Event) {
      // If there's a selected shelter, reset the size of it
      if( _sheltersMap.selectedHospitalMarker !== null ) {
        _sheltersMap.setSizeOfMarkerAsOriginal(_sheltersMap.selectedHospitalMarker, 'hospital');
      }

      // Set the new selected shelter
      _sheltersMap.selectedHospitalMarker = this;

      _sheltersMap.setSizeOfMarkerAsSelected(this, 'hospital');

      // Write path
      _sheltersMap.findClosestPath(
        _sheltersMap.selectedShelterMarker.shelter.position,
        _sheltersMap.selectedHospitalMarker.hospital.position,
        false,
        google.maps.TravelMode['WALKING']
      );
    });
  }
}