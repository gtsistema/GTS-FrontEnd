import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class SidebarStateService {
  private collapsedSubject = new BehaviorSubject<boolean>(true);
  public collapsed$ = this.collapsedSubject.asObservable();

  constructor() {}

  setCollapsed(collapsed: boolean): void {
    this.collapsedSubject.next(collapsed);
  }

  getCollapsed(): boolean {
    return this.collapsedSubject.value;
  }
}
