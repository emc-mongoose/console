import { Component, OnInit } from '@angular/core';
import { IpAddressService } from '../ip-address.service';
import { map, subscribeOn } from 'rxjs/operators';

import { Config } from '../config';
import { IpAddress } from '../ipAddress';
import { Router } from '@angular/router';

@Component({
  selector: 'app-nodes',
  templateUrl: './nodes.component.html',
  styleUrls: ['./nodes.component.css'],
  providers: [IpAddressService]
})
export class NodesComponent implements OnInit {

  ipAddresses: IpAddress[] = null;
  ip: string = "";

  config: any = null;

  constructor(private ipAddressService: IpAddressService, private router: Router) { }

  ngOnInit() {
    this.ipAddresses = this.ipAddressService.getIpAddresses();
  }

  addIp(ip: string): void {

    if (!ip) {
      console.log('ip null');
    }
    this.ipAddressService.saveIpAddress(ip);
    console.log(ip);
  }

  deleteIp(ipAddr: IpAddress): void {
    this.ipAddressService.deleteIp(ipAddr.ip);
  }

  onNavigateNextClicked() {
    if (this.ipAddressService.ipAddresses.length == 0) {
      alert('no IP entered!');
      return;
    }
    console.log(this.ipAddresses[0].ip);
    this.ipAddressService.entryNode = this.ipAddressService.ipAddresses[0].ip;

    this.ipAddressService.getConfig(this.ipAddressService.ipAddresses[0].ip)
      .subscribe(data => {
        console.log(data);
        this.updateConfiguration(data);
      });
  }

  private updateConfiguration(data: any) {
    console.log(data);
    this.config = data;
    this.ipAddressService.config = new Config(this.ipAddressService.ipAddresses[0].ip, this.config);
    if (this.config == null) {
      alert('Can not get config! Remove first IP and if neccessary add another one.');
    } else {
      console.log('OK');
      this.router.navigate(["/control"]);
    }
  }

}
