// ------------------------------------------------------------------------------------------------------------
// Stores global selected project state (id + name).
// Used across modules to know which project is active.
// ------------------------------------------------------------------------------------------------------------

export let selectedProjectId = null; // el id seleccionado de proyecto
export let selectedProjectName = "UNKNOWN"; // proyecto actual seleccionado


/**
 * Updates selected project globally
 * @param {string} id
 * @param {string} name
 */
export function setProject(id, name) {
    selectedProjectId = id;
    selectedProjectName = name;
}