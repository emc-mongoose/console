import { Component, OnInit, Input, OnDestroy } from '@angular/core';
import { MonitoringApiService } from 'src/app/core/services/monitoring-api/monitoring-api.service';
import { BasicTab } from 'src/app/common/BasicTab/BasicTab';
import { MongooseRunRecord } from 'src/app/core/models/run-record.model';
import { ActivatedRoute, Router } from '@angular/router';
import { RouteParams } from 'src/app/modules/app-module/Routing/params.routes';
import { RoutesList } from 'src/app/modules/app-module/Routing/routes-list';
import { Observable, Subscription, of, BehaviorSubject } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { MongooseRouteParamsParser } from 'src/app/core/models/mongoose-route-params-praser';
import { MongooseRunEntryNode } from 'src/app/core/services/local-storage-service/MongooseRunEntryNode';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { EntryNodeSelectionComponent } from '../common/entry-node-selection/entry-node-selection.component';
import { LocalStorageService } from 'src/app/core/services/local-storage-service/local-storage.service';
import { MongooseLogModel } from 'src/app/core/models/mongoose.log.model';
import { SharedLayoutService } from 'src/app/core/services/shared-layout-service/shared-layout.service';
import { MongooseNotification } from 'src/app/core/services/shared-layout-service/notification/mongoose-notification.model';


@Component({
  selector: 'app-run-statistic-logs',
  templateUrl: './run-statistic-logs.component.html',
  styleUrls: ['./run-statistic-logs.component.css']
})
export class RunStatisticLogsComponent implements OnInit, OnDestroy {

  public static readonly TAG: string = "RunStatisticLogsComponent";

  // NOTE: Public fields are mostly used within DOM. 
  public displayingTextContent = '';

  private processingRunRecord: MongooseRunRecord;
  private logTabs$: BehaviorSubject<BasicTab[]> = new BehaviorSubject<BasicTab[]>([]);
  private shouldDisplayErrorAlert: boolean = false;

  private monitoringApiSubscriptions: Subscription = new Subscription();
  private routeParamsSubscription: Subscription = new Subscription();

  // MARK: - Lifecycle

  constructor(private monitoringApiService: MonitoringApiService,
    private router: Router,
    private route: ActivatedRoute,
    private modalService: NgbModal,
    private localStorageService: LocalStorageService,
    private sharedLayoutService: SharedLayoutService) { }

  ngOnInit() { }

  ngAfterContentInit() {

    // NOTE: Getting ID of the required Run Record from the HTTP query parameters. 
    this.routeParamsSubscription.add(
      this.route.parent.params.subscribe((params: any) => {
        console.log(`${RunStatisticLogsComponent.TAG} parent params subsription`)
        let mongooseRouteParamsParser: MongooseRouteParamsParser = new MongooseRouteParamsParser(this.monitoringApiService);
        try {
          this.monitoringApiSubscriptions.add(mongooseRouteParamsParser.getMongooseRunRecordByLoadStepId(params).subscribe(
            (foundRecord: MongooseRunRecord) => {
              console.log(`${RunStatisticLogsComponent.TAG} getMongooseRunRecordByLoadStepId subscription`)

              this.processingRunRecord = foundRecord;
              if (!this.shouldDisplayLogs(this.processingRunRecord)) {
                // NOTE: Timeout prevents situations when modal view will be created before the parent one. 
                setTimeout(() => this.openEntryNodeSelectionWindow());
                return;
              }
              this.initlogTabs();
            }
          ));
        } catch (recordNotFoundError) {
          // NOTE: Navigating back to 'Runs' page in case record hasn't been found. 
          this.sharedLayoutService.showNotification(new MongooseNotification('error', `Unable to load requested record information. Reason: ${recordNotFoundError.message}`));
          console.error(recordNotFoundError);
          this.router.navigate([RoutesList.RUNS]);
        }
      })
    );
  }


  ngOnDestroy() {
    this.monitoringApiSubscriptions.unsubscribe();
    this.routeParamsSubscription.unsubscribe();
    this.logTabs$.unsubscribe();
  }

  // MARK: - Public

  public getLogTabs$(): Observable<BasicTab[]> {
    return this.logTabs$.asObservable();
  }

  public changeDisplayingLog(selectedTab: BasicTab) {
    var currentLogTabs: BasicTab[] = this.logTabs$.getValue();
    currentLogTabs.forEach((tab: BasicTab) => {
      const isSelectedTab: boolean = (tab.getName() == selectedTab.getName());
      tab.isActive = isSelectedTab ? true : false;
    });
    this.logTabs$.next(currentLogTabs);

    const targetLogName: string = selectedTab.getName() as string;
    const targetLogEndpoint: string = selectedTab.getLink() as string;
    this.setDisplayingLog(targetLogName, targetLogEndpoint);
  }

  private setDisplayingLog(logName: string, targetLogEndpoint: string) {
    this.monitoringApiSubscriptions.add(
      this.monitoringApiService.getLog(this.processingRunRecord.getEntryNodeAddress(), this.processingRunRecord.getLoadStepId(), targetLogEndpoint).subscribe(
        (logs: string) => {
          console.log(`${RunStatisticLogsComponent.TAG} monitoring API logs subscription`)

          this.shouldDisplayErrorAlert = false;
          this.displayingTextContent = logs;
        },
        (error: any) => {
          this.shouldDisplayErrorAlert = true;
          const misleadingMessage: string = `Requested logs file "${logName}" hasn't been created yet.`;
          this.displayingTextContent = misleadingMessage;
        }
      )
    );
  }

  public shouldDisplayLogs(record: MongooseRunRecord): boolean {
    if (record == undefined) {
      return false;
    }
    return (record.getEntryNodeAddress() != MongooseRunEntryNode.EMPTY_ADDRESS);
  }


  /**
   * @returns true  if the requested log should be displayed.
   */
  public isLogExist(): boolean {
    return !this.shouldDisplayErrorAlert;
  }

  public openEntryNodeSelectionWindow() {
    const entryRunNodeEntranceScreenReference = this.modalService.open(EntryNodeSelectionComponent, { ariaLabelledBy: 'modal-basic-title', backdropClass: 'light-blue-backdrop' });
    entryRunNodeEntranceScreenReference.componentInstance.mongooseRunRecord = this.processingRunRecord;
    entryRunNodeEntranceScreenReference.result.then(
      (result) => {
        console.error(`Unexpected finish of node entrance window: ${result}`);
      }, (entryNodeAddress) => {
        const emptyValue = "";
        // NOTE: Do nothing if entry node address hasn't been entetred. 
        if (entryNodeAddress == emptyValue) {
          this.router.navigate(['/' + RoutesList.RUN_STATISTICS + '/' + this.processingRunRecord.getLoadStepId()
            + '/' + RoutesList.RUN_CHARTS]);
          return;
        }
        this.processingRunRecord.setEntryNodeAddress(entryNodeAddress);
        // NOTE: Save pair "resource - run ID" to local storage.
        const entryNodeRunId: string = this.processingRunRecord.getRunId() as string;
        this.localStorageService.saveToLocalStorage(entryNodeAddress, entryNodeRunId);
        // NOTE: Reinitializing log tabs with existing entry node address.
        this.initlogTabs();
      }
    )
  }

  // MARK: - Private

  private initlogTabs() {
    const currentNodeAddress: string = this.processingRunRecord.getEntryNodeAddress();
    this.monitoringApiSubscriptions.add(
      this.monitoringApiService.getLogsForRunNode(currentNodeAddress)
      .subscribe(
        (mongooseLogs: MongooseLogModel[]) => {
          console.log(`${RunStatisticLogsComponent.TAG} monitoringApiService getLogsForRunNode subscription`)

          var displayingLogTabs: BasicTab[] = [];
          for (var mongooseLog of mongooseLogs) {
            // NOTE: Creating same amount of tabs as the fetched log types.
            const tabName: string = mongooseLog.getName();
            const tabLink: string = mongooseLog.getEndpoint();
            let tab: BasicTab = new BasicTab(tabName, tabLink);

            displayingLogTabs.push(tab);
          }
          this.logTabs$.next(displayingLogTabs);

          // NOTE: Set first found tab as initial.
          const createdTabs: BasicTab[] = this.logTabs$.getValue();
          if (createdTabs.length == 0) { 
            this.shouldDisplayErrorAlert = true; 
            console.warn(`Unable to find any Mongoose logs.`);
            return;
          }
          const initialTab: BasicTab = createdTabs[0];
          this.changeDisplayingLog(initialTab);
        },
        (error: any) => { 
          this.shouldDisplayErrorAlert = true; 
          console.warn(`Unable to find any Mongoose logs.`);
        }
      ),
    );
  }
}
