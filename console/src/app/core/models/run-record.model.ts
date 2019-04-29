import { MongooseRunStatus } from './mongoose-run-status';
import { BehaviorSubject, Subscription, Observable } from 'rxjs';
import { OnDestroy } from '@angular/core';

export class MongooseRunRecord implements OnDestroy {

    private readonly DEFAULT_VALUE = "-";

    public startTime: String;
    public nodes: String[];
    public comment: String;

    private readonly runId: String;
    private loadStepId: String = ""; 

    private duration: string;
    private statusSubscription: Subscription = new Subscription();
    private currentStatus: MongooseRunStatus = MongooseRunStatus.Unavailable;

    // MARK: - Lifecycle 

    constructor(runId: String, loadStepId: String, mongooseRunStatus$: Observable<MongooseRunStatus>, startTime: String, nodes: String[], duration: string, comment: String) {
        this.runId = runId;
        this.loadStepId = loadStepId;
        this.startTime = startTime;
        this.nodes = nodes;
        this.duration = duration;
        this.comment = comment;

        this.statusSubscription.add(mongooseRunStatus$.subscribe(
            fetchedStatus => {
                this.currentStatus = fetchedStatus;
            },
            error => { 
                this.currentStatus = MongooseRunStatus.Unavailable;
            }
        ));
    }

    ngOnDestroy(): void {
        this.statusSubscription.unsubscribe();
    }

    // MARK: - Public

    public getLoadStepId(): String { 
        return this.loadStepId;
    }

    public getDuration(): string {
        if (this.duration == "") {
            return this.DEFAULT_VALUE;
        }
        return this.duration;
    }

    public getRunId(): String {
        return this.runId;
    }

    public getNodesList(): String[] {
        if (this.nodes.length == 0) {
            return [this.DEFAULT_VALUE];
        }
        return this.nodes;
    }

    public getComment(): String {
        let isEmpty: boolean = (this.comment == "");
        return (isEmpty ? this.DEFAULT_VALUE : this.comment)
    }

    public getStatus(): MongooseRunStatus {
        return this.currentStatus;
    }

    public  getStartTime(): String {
        return this.startTime;
    }

    public getDuraton(): string {
        return this.duration;
    }

    public setDuration(updatedDuration: string) {
        this.duration = updatedDuration;
    }

    // MARK: - Private 

}
