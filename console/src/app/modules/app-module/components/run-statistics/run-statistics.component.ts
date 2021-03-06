import { Component, OnInit, OnDestroy } from "@angular/core";
import { RoutesList } from "../../Routing/routes-list";
import { MongooseRunRecord } from "src/app/core/models/run-record.model";
import { BasicTab } from "src/app/common/BasicTab/BasicTab";
import { Subscription } from "rxjs";
import { ActivatedRoute, Router } from "@angular/router";
import { MonitoringApiService } from "src/app/core/services/monitoring-api/monitoring-api.service";
import { RouteParams } from "../../Routing/params.routes";
import { MongooseRunStatus } from "src/app/core/models/mongoose-run-status";
import { ControlApiService } from "src/app/core/services/control-api/control-api.service";
import { PrometheusApiService } from "src/app/core/services/prometheus-api/prometheus-api.service";
import { SharedLayoutService } from "src/app/core/services/shared-layout-service/shared-layout.service";
import { MongooseNotification } from "src/app/core/services/shared-layout-service/notification/mongoose-notification.model";


@Component({
  selector: 'app-run-statistics',
  templateUrl: './run-statistics.component.html',
  styleUrls: ['./run-statistics.component.css']
})

export class RunStatisticsComponent implements OnInit, OnDestroy {

  public static readonly TAG: string = "RunStatisticsComponent";

  private readonly STATISTICS_SECTIONS = [
    { name: "Charts", url: RoutesList.RUN_CHARTS },
    { name: "Logs", url: RoutesList.RUN_LOGS }
  ];

  // NOTE: Displaying run record and related statistic tabs. 
  // Objects are being used within DOM. 
  public runRecord: MongooseRunRecord;
  public statisticTabs: BasicTab[] = [];

  private routeParameters: any;
  private monitoringApiSubscriptions: Subscription = new Subscription();
  private controlApiSubscriptions: Subscription = new Subscription();

  // MARK: - Lifecycle 

  constructor(private route: ActivatedRoute,
    private router: Router,
    private monitoringApiService: MonitoringApiService,
    private controlApiService: ControlApiService,
    private sharedLayoutService: SharedLayoutService) {
  }

  ngOnInit() {
    console.log(`${RunStatisticsComponent.TAG} onInit`)
    // NOTE: Getting ID of the required Run Record from the HTTP query parameters. 
    this.routeParameters = this.route.params.subscribe(params => {
      console.log(`${RunStatisticsComponent.TAG} Route params subscription`);
      let targetRecordLoadStepId = params[RouteParams.ID];
      try {
        this.monitoringApiSubscriptions = this.monitoringApiService.getMongooseRunRecordByLoadStepId(targetRecordLoadStepId).subscribe(
          foundRecord => {
            console.log(`${RunStatisticsComponent.TAG} Route params sunscription -> monitoring API subscription`)
            this.runRecord = foundRecord;
          },
          error => {
            console.log(`${RunStatisticsComponent.TAG} Route params sunscription -> error`)

            let misleadingMsg = `Unable to display statistics for Mongoose run record with ID ${targetRecordLoadStepId}, reason: ${error.message}`;

            // TODO: Figure out whether error alers should be displayed or not
            console.error(misleadingMsg);
            return;
          }
        )
        this.initTabs();
      } catch (recordNotFoundError) {
        // NOTE: Navigating back to 'Runs' page in case record hasn't been found. 
        console.error(recordNotFoundError);
        this.router.navigate([RoutesList.RUNS]);
      }
    });
  }

  ngOnDestroy() {
    this.monitoringApiSubscriptions.unsubscribe();
    this.controlApiSubscriptions.unsubscribe();
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

  public isRunActive(runRecord: MongooseRunRecord) {
    return (runRecord.getStatus() == MongooseRunStatus.Running);
  }

  public onTerminateBtnClicked(runRecord: MongooseRunRecord) {
    let terminatingRunId = runRecord.getRunId();
    let terminatingRunEntryNodeAddress = runRecord.getEntryNodeAddress();
    this.controlApiSubscriptions.add(
      this.controlApiService.terminateMongooseRun(terminatingRunEntryNodeAddress, terminatingRunId as string).subscribe(
        (terminationStatusMessage: string) => {
          console.log(`${RunStatisticsComponent.TAG} termination subscription.`)
          this.sharedLayoutService.showNotification(new MongooseNotification('error', `Mongoose run ${terminatingRunId} has been successfully terminated.`))
          window.location.reload();
        }
      )
    );
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
    if (!this.canStatisticsBeLoadedForRecord(this.runRecord)) {
      console.error(`Unable to load statistics for Mongoose run with id ${this.runRecord.getRunId()} since it doesn't have load step ID.`);
      return;
    }
    this.router.navigate(['/' + RoutesList.RUN_STATISTICS + '/' + this.runRecord.getLoadStepId()
      + '/' + selectedTab.getLink()]);
  }

  private canStatisticsBeLoadedForRecord(record: MongooseRunRecord) {
    let emptyValue = "";
    let hasLoadStepId = (record.getLoadStepId() != emptyValue);
    return hasLoadStepId;
  }

}
