const aceEditors = {};

document.addEventListener('DOMContentLoaded', function() {
    // Initialize the first Quill editor
    new Quill('.text-editor', {
        theme: 'bubble',
        placeholder: 'Share your knowledge, help others grow.'
    });

    // Add the save button clicking action
    document.getElementById('fileInput').addEventListener('change', loadNotebook);

    // Initialize Ace Editor for existing code-editor sections
    document.querySelectorAll('.code-editor').forEach(editorDiv => {
        // Store the editor instance for later use
        const editorId = generateUniqueId();
        editorDiv.id = editorId;

        // Create Ace Editor in the container
        createAceEditor(editorDiv, editorId);
    });
});

function generateUniqueId() {
    return 'code_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
}

function createAceEditor(editorDiv, editorId) {
    // Initialize Ace Editor
    const editor = ace.edit(editorDiv, {
        mode: "ace/mode/java",
        placeholder: "Share your code and check it out.",
        minLines: 5,
        maxLines: 50,
        autoScrollEditorIntoView: true
    });
    editor.renderer.setScrollMargin(10, 10, 10, 10);

    // Store the editor instance by the unique ID
    aceEditors[editorId] = editor;

    return editor;
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
        const editorDiv = document.createElement('div');
        editorDiv.className = 'code-editor';

        // Generate and set a unique ID for the editor
        const editorId = generateUniqueId();
        editorDiv.id = editorId;

        newSection.appendChild(editorDiv);

        // Initialize Ace Editor, and hold the area to focus on
        newEditor = createAceEditor(editorDiv, editorId);
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

window.runCode = async function(button) {
    const codeEditor = button.closest('.editor-section').querySelector('.code-editor');
    const code = aceEditors[codeEditor.id].getValue();


    // Check for an existing result div
    let resultDiv = button.closest('.editor-section').querySelector('.evaluation-result');
    if (!resultDiv) {
        // Create a div to display the result if it doesn't exist
        resultDiv = document.createElement('div');
        resultDiv.className = 'evaluation-result';
        const buttonsDiv = button.closest('.section-buttons');
        buttonsDiv.parentNode.insertBefore(resultDiv, buttonsDiv);
    }

    try {
        const response = await fetch('/go', {
                method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                code
            })
        });
        const data = await response.json();

        // Update the content and class of the result div based on the status
        resultDiv.textContent = `Status: ${data.status ? 'Success' : 'Failed'}\nMessage:\n${data.message}`;
        resultDiv.className = data.status ? 'evaluation-result good' : 'evaluation-result failed';
    } catch (error) {
        resultDiv.textContent = `Status: Failed\nMessage:\nUh oh, seems like our servers have taken a cat nap!`;
        resultDiv.className = 'evaluation-result failed';
        console.error('Error running code:', error);
    }
};

function saveNotebook() {
    const sections = document.querySelectorAll('.editor-section');
    const notebookData = Array.from(sections).map(section => {
        // Check for a text editor
        const textEditor = section.querySelector('.text-editor .ql-editor');
        const textContent = textEditor ? textEditor.innerHTML : null;

        // Check for an Ace Editor
        const aceEditorDiv = section.querySelector('.code-editor');
        let codeContent = null;
        if (aceEditorDiv && aceEditorDiv.id && aceEditors[aceEditorDiv.id]) {
            codeContent = aceEditors[aceEditorDiv.id].getValue();
        }

        return { text: textContent, code: codeContent };
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
            const editorDiv = document.createElement('div');
            editorDiv.className = 'code-editor';

            // Generate and set a unique ID for the editor
            const editorId = generateUniqueId();
            editorDiv.id = editorId;

            section.appendChild(editorDiv);

            // Initialize Ace Editor with the saved content
            const editor = createAceEditor(editorDiv, editorId);
            editor.setValue(sectionData.code);
        }

        const buttonsDiv = createButtonsDiv(sectionData.code ? 'code' : 'text');
        section.appendChild(buttonsDiv);
        editorContainer.appendChild(section);
    });
}
