export class AlgorithmEditor {
  private editor: any = null;
  private container: HTMLElement;
  private saveCallback: ((code: string) => void) | null = null;
  
  constructor(containerId: string) {
    const container = document.getElementById(containerId);
    if (!container) {
      throw new Error(`Container element not found: ${containerId}`);
    }
    this.container = container;
    
    // Wait for Monaco to be fully loaded from CDN before setting up editor
    if ((window as any).monaco) {
      this.setupEditor();
    } else {
      // If Monaco isn't loaded yet, wait for it (it should be loaded by the time this runs)
      console.debug("Waiting for Monaco to load...");
      window.onload = () => {
        this.setupEditor();
      };
    }
    
    // Add a clear TypeScript notice in the editor
    const typescriptNotice = document.createElement('div');
    typescriptNotice.className = 'typescript-notice';
    typescriptNotice.innerHTML = `
      <div class="info-message">
        <strong>TypeScript Editor Tips:</strong> 
      </div>
    `;
    this.container.parentElement?.insertBefore(typescriptNotice, this.container);
  }

  private async setupEditor(): Promise<void> {
    const monaco = (window as any).monaco;
    if (!monaco) {
      console.error("Monaco editor not loaded!");
      return;
    }

    // Initialize Monaco Editor
    monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
      target: monaco.languages.typescript.ScriptTarget.ES2015,
      allowNonTsExtensions: true,
      moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
      module: monaco.languages.typescript.ModuleKind.CommonJS,
      noEmit: true,
      typeRoots: ["node_modules/@types"],
      lib: ["es2015"]
    });

    // Add type definitions for the elevator algorithm interface
    this.addTypeDefinitions(monaco);

    // load template code from local storage or server
    const templateCode = await this.loadTemplateCode();

    // Create editor
    this.editor = monaco.editor.create(this.container, {
      value: templateCode,
      language: 'typescript',
      theme: 'vs-dark',
      automaticLayout: true,
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
      fontSize: 14,
      lineNumbers: 'on',
      folding: true
    });

    // Create UI controls
    this.createControls();
  }

  private async loadTemplateCode(): Promise<string> {
    // Load template code from a local file or server
    // check if we have specific key stored in local storage, then use that
    // otherwise fetch from server
    const storedCode = localStorage.getItem('elevatorAlgorithmCode');
    if (storedCode) {
        return storedCode;
    }
    
    const response = await fetch('example.ts');
    if (response.ok) {
        const text = await response.text();
        localStorage.setItem('elevatorAlgorithmCode', text); // Store for future use
        return text;
    } else {
        console.error("Failed to load template code from server.");
        return ""
    }
  }

  private async addTypeDefinitions(monaco: any): Promise<void> {
    try {
      // Load both interface and base class definitions
      const interfaceContent = await fetch('/algorithms/IElevatorAlgorithm.d.ts');
      const baseClassContent = await fetch('/algorithms/BaseElevatorAlgorithm.d.ts');
      
      if (interfaceContent.ok && baseClassContent.ok) {
        const interfaceText = await interfaceContent.text();
        const baseClassText = await baseClassContent.text();
        
        // Configure compiler options first - this is important
        monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
          ...monaco.languages.typescript.typescriptDefaults.getCompilerOptions(),
          allowSyntheticDefaultImports: true,
          esModuleInterop: true,
          noImplicitAny: true,
          strict: true,
          moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
          baseUrl: ".",
          paths: {
            "@elevator-base": ["algorithms/BaseElevatorAlgorithm"],
            "@elevator-interfaces": ["algorithms/IElevatorAlgorithm"]
          }
        });
        
        // Add declarations directly to Monaco's TypeScript service
        monaco.languages.typescript.typescriptDefaults.addExtraLib(interfaceText, 'ts:filename/IElevatorAlgorithm.d.ts');
        monaco.languages.typescript.typescriptDefaults.addExtraLib(baseClassText, 'ts:filename/BaseElevatorAlgorithm.d.ts');
        
        // Add module declaration for @elevator-base (simpler approach)
        const baseModuleContent = `
          declare module "@elevator-base" {
            ${baseClassText}
            export default BaseElevatorAlgorithm;
          }
        `;
        
        // Add module declaration for @elevator-interfaces with direct re-exports
        const interfaceModuleContent = `
          declare module "@elevator-interfaces" {
            ${interfaceText}
            export { 
              ElevatorStatusState,
              ElevatorData, 
              PersonData, 
              ElevatorWaitingStats,
              FloorStats,
              BuildingData,
              IElevatorAlgorithm
            }
          }
        `;
        
        monaco.languages.typescript.typescriptDefaults.addExtraLib(baseModuleContent, 'ts:filename/@elevator-base.d.ts');
        monaco.languages.typescript.typescriptDefaults.addExtraLib(interfaceModuleContent, 'ts:filename/@elevator-interfaces.d.ts');
        
        console.log("Type definitions added successfully.");
      } else {
        console.error("Failed to fetch type definitions");
              }
    } catch (error) {
      console.error("Error loading type definitions:", error);
      }
  }

  private createControls(): void {
    const controlsContainer = document.createElement('div');
    controlsContainer.className = 'editor-controls';
    
    // Save button
    const saveButton = document.createElement('button');
    saveButton.textContent = 'Apply Algorithm';
    saveButton.className = 'editor-button save-button';
    saveButton.onclick = () => this.saveCode();
    
    // Reset button
    const resetButton = document.createElement('button');
    resetButton.textContent = 'Reset to Template';
    resetButton.className = 'editor-button reset-button';
    resetButton.onclick = () => this.resetCode();
    
    // Load example dropdown
    // const exampleLabel = document.createElement('label');
    // exampleLabel.textContent = 'Load example:';
    // exampleLabel.className = 'example-label';
    
    const exampleSelect = document.createElement('select');
    exampleSelect.className = 'example-select';
    
    // Add example options
    ['Empty Template'].forEach((name, index) => {
      const option = document.createElement('option');
      option.value = index.toString();
      option.textContent = name;
      exampleSelect.appendChild(option);
    });
    
    // exampleSelect.onchange = (e) => {
    //   const selectedIndex = parseInt((e.target as HTMLSelectElement).value);
    //   this.loadExample(0);
    // };
    
    // controlsContainer.appendChild(exampleLabel);
    // controlsContainer.appendChild(exampleSelect);
    controlsContainer.appendChild(saveButton);
    controlsContainer.appendChild(resetButton);
    
    this.container.parentElement?.insertBefore(controlsContainer, this.container);
  }

  private saveCode(): void {
    if (this.editor && this.saveCallback) {
      const code = this.editor.getValue();
      this.saveCallback(code);
    }
  }

  public async resetCode(): Promise<void> {
    if (this.editor) {
        const code = await this.loadTemplateCode()
      this.editor.setValue(code);
    }
  }

  public onSave(callback: (code: string) => void): void {
    this.saveCallback = callback;
  }

  public setValue(code: string): void {
    if (this.editor) {
      this.editor.setValue(code);
    }
  }

  public getValue(): string {
    return this.editor ? this.editor.getValue() : '';
  }

  /**
   * Load algorithm code by name 
   */
  public async loadAlgorithmByName(name: string): Promise<boolean> {
    if (!this.editor) return false;
    
    // Import the getCustomAlgorithmCode function
    const { getCustomAlgorithmCode } = await import('../algorithms/scripts/register');
    
    const code = getCustomAlgorithmCode(name);
    if (code) {
      this.editor.setValue(code);
      return true;
    }
    
    // If algorithm not found, load template
    const templateCode = await this.loadTemplateCode();
    this.editor.setValue(templateCode);
    return false;
  }
}
