import { Observable } from 'rxjs';
import { MongooseChartDataProvider } from './mongoose-chart-data-provider.interface';
import { MongooseMetric } from '../mongoose-metric.model';

export class MongooseChartDao {

    private chartDataProvider: MongooseChartDataProvider;

    constructor(dataProvider: MongooseChartDataProvider) {
        this.chartDataProvider = dataProvider;
    }

    public getDuration(loadStepId: string): Observable<any> {
        return this.chartDataProvider.getDuration(loadStepId);
    }

    public getLatencyMax(lastSecondsAmount: number, loadStepId: string): Observable<MongooseMetric> {
        return this.chartDataProvider.getLatencyMax(lastSecondsAmount, loadStepId);
    }

    public getLatencyMin(periodInSeconds: number, loadStepId: string): Observable<MongooseMetric> {
        return this.chartDataProvider.getLatencyMin(periodInSeconds, loadStepId);
    }

    public getBandWidth(periodInSeconds: number, loadStepId: string): Observable<MongooseMetric> {
        return this.chartDataProvider.getBandWidth(periodInSeconds, loadStepId);
    }

    public getAmountOfFailedOperations(periodInSeconds: number, loadStepId: string): Observable<MongooseMetric> {
        return this.chartDataProvider.getAmountOfFailedOperations(periodInSeconds, loadStepId);
    }

    public getAmountOfSuccessfulOperations(periodInSeconds: number, loadStepId: string): Observable<MongooseMetric> {
        return this.chartDataProvider.getAmountOfSuccessfulOperations(periodInSeconds, loadStepId);
    }

}