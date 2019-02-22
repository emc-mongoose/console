import { Component, OnInit, ViewChild } from '@angular/core';
import { IpAddressService } from 'src/app/core/services/ip-addresses/ip-address.service';
import { CodemirrorComponent } from '@ctrl/ngx-codemirror';
import { Doc } from 'codemirror';
import { FileOperations } from 'src/app/common/FileOperations/FileOperations';
import { FileFormat } from 'src/app/common/FileOperations/FileFormat';
import { Constants } from 'src/app/common/constants';



@Component({
  selector: 'app-scenarios',
  templateUrl: './scenarios.component.html',
  styleUrls: ['./scenarios.component.css']
})
export class ScenariosComponent implements OnInit {

  @ViewChild('scenarioCodeEditor') codeEditor: CodemirrorComponent;

  readonly scenarioEditorOptions = {
    lineNumbers: true,
    theme: 'default',
    mode: { name: 'javascript', typescript: true },
  };

  private fileContent: string | ArrayBuffer;
  private processingFile: File;

  readonly CODE_EDITOR_PLACEHOLDER = Constants.Placeholders.CODE_EDITOR_PLACEHOLDER;

  constructor(private service: IpAddressService) { 
    this.fileContent = ""
    this.processingFile = null;
  }

  // MARK: - Component lifecycle

  ngOnInit() {
  }

  ngAfterViewInit() { 
    this.setValueForEditor(this.CODE_EDITOR_PLACEHOLDER);
  }

  private setValueForEditor(newValue: string) { 
    const { doc } = this;
    if (doc) { 
      doc.setValue(newValue);
    }
  }

  private getValueFromEditor(): string | undefined { 
    const { doc } = this;
    if (!doc) { 
      return null;
    }
    return doc.getValue(); 
  }

  get doc() {
    // NOTE: The "core" of CodeMirror editor is Doc. 
    return (this.codeEditor.codeMirror as any) as Doc;
  }

  processFile(event) { 
    if (event.target.files.length == 0) {
      console.log("File hasn't been selected.");
      return;
   }
   this.processingFile = event.target.files[0];
     const fileReader = new FileReader();
     fileReader.onload = () => {
      console.log(fileReader.result);
      this.fileContent = fileReader.result;
      this.setValueForEditor(this.fileContent.toString());
      this.service.fileContent = fileReader.result;
    };
    fileReader.readAsText(this.processingFile);
  }
  
  onSaveBtnClicked() {
    const { doc } = this;
    if (this.isSavingAvaliable()) { 
      let fileSaver: FileOperations = new FileOperations();
      const filename = Constants.FileNames.SCENARIO_FILE_NAME;
      let fileFormat = FileFormat.JSON;
      let savingData = this.getValueFromEditor();
      let codeLinesDelimiter = ";";
      fileSaver.saveFile(filename, fileFormat, savingData, codeLinesDelimiter);
      let misleadingMsg = Constants.Alerts.FILE_SAVED;
      alert(misleadingMsg);
    } else { 
      let misleadingMsg = Constants.Alerts.FILE_NOT_EDITED;
      alert(misleadingMsg);
    }
  }  

    onStartBtnClicked() {
      let misleadingMsg = Constants.Alerts.MONGOOSE_HAS_STARTED;
      alert(misleadingMsg);
  }

  private isSavingAvaliable(): boolean { 
    const { doc } = this;
    const textFromCodeEditor = this.getValueFromEditor().toString();
    return ((doc) && (textFromCodeEditor != "") && (textFromCodeEditor!= this.CODE_EDITOR_PLACEHOLDER));
  }
  
  private changeTextFieldPlaceholder() { 
    const { doc } = this;
    if (!doc) {
      console.log("Couldn't connect to code editor."); 
      return; 
    }
    const codeEditorText = doc.getValue(); 
    const emptyString = "";
    switch (codeEditorText) { 
      case this.CODE_EDITOR_PLACEHOLDER: {
        doc.setValue(emptyString);
        break; 
      }
      case emptyString: {
        doc.setValue(this.CODE_EDITOR_PLACEHOLDER);
        break;
      }
    }
  }

  onScenarioEditorFocusChange() { 
    this.changeTextFieldPlaceholder();
  }
}