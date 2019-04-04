import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MonitoringApiService } from '../core/services/monitoring-api/monitoring-api.service';
import { MongooseRunRecord } from '../core/models/run-record.model';
import { BasicTab } from '../common/BasicTab/BasicTab';
import { RoutesList } from '../Routing/routes-list';
import { RouteParams } from '../Routing/params.routes';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-run-statistics',
  templateUrl: './run-statistics.component.html',
  styleUrls: ['./run-statistics.component.css']
})
export class RunStatisticsComponent implements OnInit {

  private readonly STATISTICS_SECTIONS = [
    { name: "Logs", url: RoutesList.RUN_LOGS },
    { name: "Charts", url: RoutesList.RUN_CHARTS }
  ];

  // NOTE: Displaying run record and related statistic tabs. 
  // Objects are being used within DOM. 
  public runRecord: MongooseRunRecord;
  public statisticTabs: BasicTab[] = [];

  private routeParameters: any;
  private monitoringApiSubscriptions: Subscription; 

  // MARK: - Lifecycle 

  constructor(private route: ActivatedRoute,
    private router: Router,
    private monitoringApiService: MonitoringApiService) {
  }

  ngOnInit() {
    // NOTE: Getting ID of the required Run Record from the HTTP query parameters. 
    this.routeParameters = this.route.params.subscribe(params => {
      let targetRecordLoadStepId = params[RouteParams.ID];
      try { 
        this.monitoringApiSubscriptions = this.monitoringApiService.getMongooseRunRecordByLoadStepId(targetRecordLoadStepId).subscribe(
          foundRecord => { 
            this.runRecord = foundRecord; 
          },
          error => { 
            console.error(`Unable to display statistics for Mongoose run record with ID ${targetRecordLoadStepId}, reason: ${error.message}`);
          }
        )
        this.initTabs();
      } catch (recordNotFoundError) { 
        // NOTE: Navigating back to 'Runs' page in case record hasn't been found. 
        alert("Unable to load requested record.");
        console.error(recordNotFoundError);
        this.router.navigate([RoutesList.RUNS]);
      }
    });
  }

  ngOnDestroy() {
    this.routeParameters.unsubscribe();
  }

  // MARK: - Public 

  public switchTab(targetTab: BasicTab) {
    this.statisticTabs.forEach(section => {
      if (targetTab.isEqual(section)) {
        section.isActive = true;
        return;
      }
      section.isActive = false;
    });
    this.loadTab(targetTab);
  }

  // MARK: - Private

  private initTabs() {
    // NOTE: Filling up statistic tabs data  
    for (let section of this.STATISTICS_SECTIONS) {
      let tab = new BasicTab(section.name, section.url);
      this.statisticTabs.push(tab);
    }
    let initialSelectedTabNumber = 0;
    const initialTab = this.statisticTabs[initialSelectedTabNumber];
    initialTab.isActive = true;
    this.loadTab(initialTab);
  }

  private loadTab(selectedTab: BasicTab) {
    this.router.navigate(['/' + RoutesList.RUN_STATISTICS + '/' + this.runRecord.getIdentifier()
      + '/' + selectedTab.getLink()]);
  }

}
