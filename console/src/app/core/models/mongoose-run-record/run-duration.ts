// TODO: Configure the class with respect to Mongoose API's part responsible for ...
// ... providing the duration of the run. As for now, the types are set to string. 
    
export class RunDuration { 

    private startTime: string;
    private endTime: string;

    constructor(startTime: string, endTime: string) { 
        this.startTime = startTime;
        this.endTime = endTime; 
    }

    // MARK: - Public

    // TODO: Impliment method
    getDuration(): string { 
        const testDuration = "00d 00h 00m 00s";
        return testDuration;
    }

}