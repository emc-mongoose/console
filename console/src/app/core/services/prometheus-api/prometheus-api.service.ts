import { Injectable } from '@angular/core';
import { HttpHeaders, HttpClient } from '@angular/common/http';
import { Constants } from 'src/app/common/constants';
import { Observable, of } from 'rxjs';
import { map, filter, tap, catchError } from 'rxjs/operators';
import { MongooseChartDataProvider } from '../../models/chart/mongoose-chart-interface/mongoose-chart-data-provider.interface';
import { MongooseMetric } from '../../models/chart/mongoose-metric.model';
import { PrometheusResponseParser } from './prometheus-response.parser';
import { HttpUtils } from 'src/app/common/HttpUtils';
import { LocalStorageService } from '../local-storage-service/local-storage.service';
import { MetricValueType } from '../../models/chart/mongoose-chart-interface/metric-value-type';


@Injectable({
  providedIn: 'root'
})


export class PrometheusApiService implements MongooseChartDataProvider {

  private readonly MAX_LATENCY_METRIC_NAME = "mongoose_latency_max";
  private readonly MIN_LATENCY_METRIC_NAME = "mongoose_latency_min";

  private readonly MEAN_DURATION_METRIC_NAME = "mongoose_duration_mean";
  private readonly MIN_DURATION_METRIC_NAME = "mongoose_duration_min";
  private readonly MAX_DURATION_METRIC_NAME = "mongoose_duration_max";



  private readonly SUCCESS_OPERATIONS_RATE_MEAN_METRIC_NAME = "mongoose_success_op_rate_mean";
  private readonly FAILED_OPERATIONS_RATE_MEAN_METRIC_NAME = "mongoose_failed_op_rate_mean";

  private readonly BYTE_RATE_MEAN_METRIC_NAME = "mongoose_byte_rate_mean";


  // NOTE: Symbols used for queryting Prometheus for value of metric with specific labels. They ...
  // ... are listed within the labels list. 
  readonly METRIC_LABELS_LIST_START_SYMBOL = "{";
  readonly METRIC_LABELS_LIST_END_SYMBOL = "}";

  readonly prometheusResponseParser: PrometheusResponseParser = new PrometheusResponseParser();
  private currentPrometheusAddress: string = Constants.Configuration.PROMETHEUS_IP;

  // MARK: - Lifecycle 

  constructor(private httpClient: HttpClient,
    private localStorageService: LocalStorageService) { 
      this.setupPromtheusEntryNode();
    }

  // MARK: - MogooseChartDataProvider 

  /**
   * Prometheus healthcheck. 
   * @param prometheusAddress IP address of Prometheus server.
   * @returns true if Prometheus is available on @param prometheusAddress . 
   */
  public isAvailable(prometheusAddress: string): Observable<boolean> {
    if (!HttpUtils.isIpAddressValid(prometheusAddress)) {
      return of(false);
    }
    const configurationEndpoint: string = 'status/config';
    return this.httpClient.get(`${this.getPrometheusApiBase(prometheusAddress)}${configurationEndpoint}`).pipe(
      map(
        (successfulResult: any) => {
          return true;
        }
      ),
      catchError(
        (errorResult: any) => {
          return of(false);
        }
      )
    )
  }

  /**
   * Sets @param prometheusHostIpAddress as a Prometheus' host for HTTP requests.
   */
  public setHostIpAddress(prometheusHostIpAddress: string) {
    this.currentPrometheusAddress = prometheusHostIpAddress;
  }

  public getDuration(periodInSeconds: number, loadStepId: string, metricValueType: MetricValueType): Observable<MongooseMetric[]> {
    let metricName = this.MEAN_DURATION_METRIC_NAME; 
    switch (metricValueType) { 
      case (MetricValueType.MEAN): { 
        metricName = this.MEAN_DURATION_METRIC_NAME; 
        break;
      }
      case (MetricValueType.MAX): { 
        metricName = this.MAX_DURATION_METRIC_NAME;
        break;
      } 
      case (MetricValueType.MIN): { 
        metricName = this.MIN_DURATION_METRIC_NAME;
        break;
      }
    }
    return this.runQuery(`${metricName}{load_step_id="${loadStepId}"}[${periodInSeconds}s]`).pipe(
      map(rawDurationResponse => {
        return this.prometheusResponseParser.getMongooseMetricsArray(rawDurationResponse);
      })
    );
  }

  public getAmountOfFailedOperations(periodInSeconds: number, loadStepId: string): Observable<MongooseMetric[]> {
    return this.runQuery(`${this.FAILED_OPERATIONS_RATE_MEAN_METRIC_NAME}{load_step_id="${loadStepId}"}[${periodInSeconds}s]`).pipe(
      map(rawFailedlOperationsResponse => {
        return this.prometheusResponseParser.getMongooseMetricsArray(rawFailedlOperationsResponse);
      })
    )
  }

  public getAmountOfSuccessfulOperations(periodInSeconds: number, loadStepId: string): Observable<MongooseMetric[]> {
    return this.runQuery(`${this.SUCCESS_OPERATIONS_RATE_MEAN_METRIC_NAME}{load_step_id="${loadStepId}"}[${periodInSeconds}s]`).pipe(
      map(rawSuccessfulOperationsResponse => {
        return this.prometheusResponseParser.getMongooseMetricsArray(rawSuccessfulOperationsResponse);
      })
    )
  }

  public getLatencyMax(periodInSeconds: number, loadStepId: string): Observable<MongooseMetric[]> {
    return this.runQuery(`${this.MAX_LATENCY_METRIC_NAME}{load_step_id="${loadStepId}"}[${periodInSeconds}s]`).pipe(
      map(rawMaxLatencyQueryResponse => {
        return this.prometheusResponseParser.getMongooseMetricsArray(rawMaxLatencyQueryResponse);
      })
    )
  }

  public getLatencyMin(periodInSeconds: number, loadStepId: string): Observable<MongooseMetric[]> {
    return this.runQuery(`${this.MIN_LATENCY_METRIC_NAME}{load_step_id="${loadStepId}"}[${periodInSeconds}s]`).pipe(
      map(rawMinLatencyQueryResponse => {
        return this.prometheusResponseParser.getMongooseMetricsArray(rawMinLatencyQueryResponse);
      })
    )
  }

  public getBandWidth(periodInSeconds: number, loadStepId: string): Observable<MongooseMetric[]> {
    return this.runQuery(`${this.BYTE_RATE_MEAN_METRIC_NAME}{load_step_id="${loadStepId}"}[${periodInSeconds}s]`).pipe(
      map(rawByteRateResponse => {
        return this.prometheusResponseParser.getMongooseMetricsArray(rawByteRateResponse);
      })
    )
  }

  // MARK: - Public 

  public runQuery(query: String): Observable<any> {
    let queryRequest = "query?query=";
    return this.httpClient.get(this.getPrometheusApiBase(this.currentPrometheusAddress) + queryRequest + query, Constants.Http.JSON_CONTENT_TYPE).pipe(
      map((rawResponse: any) => this.extractResultPayload(rawResponse))
    );
  }

  public reloadPrometheus(): Observable<any> {
    let reloadEndpoint = "reload";
    return this.httpClient.post(`${Constants.Http.HTTP_PREFIX + Constants.Configuration.PROMETHEUS_IP}/-/${reloadEndpoint}`, Constants.Http.EMPTY_POST_REQUEST_HEADERS);
  }

  public getDataForMetric(metric: String): Observable<any> {
    return this.runQuery(metric);
  }

  public getDataForMetricWithLabels(metric: String, labels: Map<String, String>): Observable<any> {
    let targetLabelsNames = Array.from(labels.keys());

    // NOTE: Performing query with unspecified labels in case empty labels list has been passed.
    if (targetLabelsNames.length < 1) {
      return this.runQuery(metric);
    }

    var targetLabels = "";

    // NOTE: Special symbols used to construct a query 
    let labelNameAndValueSeparator = "=";
    let labelsListDelimiter = ",";

    for (var labelName of targetLabelsNames) {
      let labelValue = labels.get(labelName);

      targetLabels += labelName + labelNameAndValueSeparator + JSON.stringify(labelValue);
      targetLabels += labelsListDelimiter;
    }

    let prometheusQuery = metric + this.METRIC_LABELS_LIST_START_SYMBOL + targetLabels + this.METRIC_LABELS_LIST_END_SYMBOL;
    return this.runQuery(prometheusQuery);
  }

  public getExistingRecordsInfo(): Observable<any> {
    // TODO: Add function that creates that kind of a query
    let targetQuery = "sum%20without%20(instance)(rate(mongoose_duration_count[1y]))";
    return this.runQuery(targetQuery);
  }

  // MARK: - Private 

  /**
   * Extracrs payload of Prometheus raw response.
   * @param rawMetric raw response from Prometheys
   * @returns Array of labels and metrics.
   */
  private extractResultPayload(rawMetric: any): any {
    // NOTE: As for 21.03.2019, Ptometheus stores array of result for a query ...
    // ... within response's data.result field.
    let dataField = "data";
    let resultFieldTag = "result";

    let labelsOfMetric = rawMetric[dataField][resultFieldTag];
    if (labelsOfMetric == undefined) {
      let misleadingMsg = "Unable to fetch Mongoose Run List. Field 'data.result' doesn't exist.";
      console.error(misleadingMsg);
      throw new Error(misleadingMsg);
    }
    return labelsOfMetric;
  }


  /**
   * @param prometheusAddress Address for which API base will be returned.
   * @returns full Prometheus' API base. Format: http//prometheushost.com/api/v1/
   */
  private getPrometheusApiBase(prometheusAddress: string): string {
    const apiBasicEndpoint = "/api/v1/";
    if (this.currentPrometheusAddress.includes(Constants.Http.HTTP_PREFIX)) {
      return (this.currentPrometheusAddress + apiBasicEndpoint);
    }
    return (Constants.Http.HTTP_PREFIX + prometheusAddress + apiBasicEndpoint);
  }


  /**
   * Tries to retrieve Prometheus' entry node form both .env file and ...
   * ... local browser's storage.
   */
  private setupPromtheusEntryNode() { 
    let isPrometheusConfiguredIpValid = HttpUtils.isIpAddressValid(this.currentPrometheusAddress);
    if (isPrometheusConfiguredIpValid) { 
      // NPTE: Reaching this block means .env file contains ...
      // ... a valid configuration of Prometheus.
      return; 
    }
    let prometheusLocalStorageAddress: string = this.localStorageService.getPrometheusHostAddress();
    this.currentPrometheusAddress = prometheusLocalStorageAddress;
  }
}
