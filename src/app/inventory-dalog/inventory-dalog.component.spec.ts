import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatGridListModule } from '@angular/material/grid-list';

import { InventoryDalogComponent } from './inventory-dalog.component';
import { InventoryDialogData } from '../models/data';

describe('InventoryDalogComponent', () => {
  let component: InventoryDalogComponent;
  let fixture: ComponentFixture<InventoryDalogComponent>;

  const dialogData = { inventory: new Map<string, number>(), gold: 0 } as InventoryDialogData;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ MatGridListModule ],
      declarations: [ InventoryDalogComponent ],
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: dialogData }
      ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(InventoryDalogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
