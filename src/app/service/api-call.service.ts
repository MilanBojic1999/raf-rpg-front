import { Injectable } from '@angular/core';
import {HttpClient, HttpErrorResponse} from "@angular/common/http";
import {catchError} from "rxjs/operators";
import {throwError} from "rxjs";

@Injectable({
  providedIn: 'root'
})
export class ApiCallService {

  private readonly apiUrl = 'http://localhost:8080';

  constructor(private http: HttpClient) {
    console.log('ApiCallService constructor called');
  }

  private static handleError(error:HttpErrorResponse){
    try {
      console.log('lol', error.error['msg'])
      return throwError(error.error['msg'])
    }catch (gre){
      return throwError(error.error)
    }
  }

  callGrid(): any{
    console.log('ApiCallService callGrid called');
    return this.http.get(this.apiUrl + '/full/matrix').pipe(catchError(ApiCallService.handleError));
  }

}
