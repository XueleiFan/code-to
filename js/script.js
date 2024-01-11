document.addEventListener('DOMContentLoaded', function() {
    // Initialize the first Quill editor
    new Quill('.text-editor', {
        theme: 'bubble',
        placeholder: 'Share your knowledge, help others grow.'
    });

    // Add the save button clicking action
    document.getElementById('fileInput').addEventListener('change', loadNotebook);

    // Initialize dynamic height for existing code editors
    document.querySelectorAll('.code-editor').forEach(textarea => {
        adjustTextareaHeight(textarea);
        textarea.addEventListener('input', function() { adjustTextareaHeight(this); });
    });
});

function adjustTextareaHeight(textarea) {
    textarea.style.height = 'auto';
    textarea.style.height = textarea.scrollHeight + 'px';
}

function createButtonsDiv(type) {
    const buttonsDiv = document.createElement('div');
    buttonsDiv.className = 'section-buttons top-right';
    buttonsDiv.innerHTML = `
        <button onclick="addSection('text', this)">Add Text</button>
        <button onclick="addSection('code', this)">Add Code</button>
        ${type === 'code' ? '<button class="run-button" onclick="runCode(this)">Run</button>' : ''}
        <button class="remove-button" onclick="removeSection(this)">Remove</button>
    `;
    return buttonsDiv;
}

window.addSection = function(type, button) {
    const currentSection = button.closest('.editor-section');
    const newSection = document.createElement('div');
    newSection.className = 'editor-section';

    let newEditor; // Variable to hold the new editor or textarea

    if (type === 'text') {
        const editor = document.createElement('div');
        editor.className = 'text-editor';
        newSection.appendChild(editor);
        newEditor = new Quill(editor, { // Set the new Quill editor for focusing
            theme: 'bubble',
            placeholder: 'Enter your text to share knowledge...'
        });
    } else if (type === 'code') {
        const textarea = document.createElement('textarea');
        textarea.className = 'code-editor';
        newSection.appendChild(textarea);
        newEditor = textarea; // Set the new textarea for focusing
    }

    const buttonsDiv = createButtonsDiv(type);
    newSection.appendChild(buttonsDiv);
    currentSection.parentNode.insertBefore(newSection, currentSection.nextSibling);

    // Automatically focus the new editor or textarea
    if (newEditor) {
        // The newEditor could be a textarea or Quill editor
        newEditor.focus();
    }
};

window.removeSection = function(button) {
    const section = button.closest('.editor-section');
    section.parentNode.removeChild(section);
};

window.runCode = function(button) {
    const codeEditor = button.closest('.editor-section').querySelector('.code-editor');
    const code = codeEditor.value;

    // Simulate code evaluation
    const resultMessage = "It is OK!"; // Simulated response message

    // Create a div to display the result
    const resultDiv = document.createElement('div');
    resultDiv.className = 'evaluation-result';
    resultDiv.textContent = 'Result: ' + resultMessage;

    // Insert the result div after the code editor and before the buttons
    const buttonsDiv = button.closest('.section-buttons');
    buttonsDiv.parentNode.insertBefore(resultDiv, buttonsDiv);
};

function saveNotebook() {
    const sections = document.querySelectorAll('.editor-section');
    const notebookData = Array.from(sections).map(section => {
        const textEditor = section.querySelector('.text-editor .ql-editor');
        const codeEditor = section.querySelector('.code-editor');

        return {
            text: textEditor ? textEditor.innerHTML : null,
            code: codeEditor ? codeEditor.value : null
        };
    });

    const notebookBlob = new Blob([JSON.stringify(notebookData, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(notebookBlob);
    a.download = 'notebook.json';
    a.click();
}

function loadNotebook() {
    const fileInput = document.getElementById('fileInput');
    if (!fileInput.files.length) {
        return; // No file selected
    }

    const file = fileInput.files[0];
    const reader = new FileReader();

    reader.onload = function(e) {
        const content = JSON.parse(e.target.result);
        recreateEditorSections(content);
    };

    reader.readAsText(file);
}

function recreateEditorSections(content) {
    const editorContainer = document.getElementById('editor-container');
    editorContainer.innerHTML = ''; // Clear existing content

    content.forEach(sectionData => {
        const section = document.createElement('div');
        section.className = 'editor-section';

        if (sectionData.text) {
            const textEditor = document.createElement('div');
            textEditor.className = 'text-editor';
            section.appendChild(textEditor);
            new Quill(textEditor, { theme: 'bubble', placeholder: 'Share your knowledge, help others grow.' });
            textEditor.querySelector('.ql-editor').innerHTML = sectionData.text;
        } else if (sectionData.code) {
            const codeEditor = document.createElement('textarea');
            codeEditor.className = 'code-editor';
            codeEditor.value = sectionData.code;
            section.appendChild(codeEditor);

            // Wait for the next tick to adjust height
            setTimeout(() => adjustTextareaHeight(codeEditor), 0);
        }

        const buttonsDiv = createButtonsDiv(sectionData.code ? 'code' : 'text');
        section.appendChild(buttonsDiv);
        editorContainer.appendChild(section);
    });
}
