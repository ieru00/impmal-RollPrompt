import { createSkillSelectionDialog } from './rp_skills.js';
import { RollDialog } from './rp_dialog.js';

Hooks.on("renderSceneControls", (controls, html) => {
  if (!game.user.isGM) return;

  const button = $(`<li class="control-tool" title="Prompt for Rolls!">
    <i class="fas fa-dice"></i>
  </li>`);

  let showAllActors = localStorage.getItem("showAllActors") === "true";
  let dialogInstance = null;

  const createDialog = () => {
    if (dialogInstance) {
      dialogInstance.close().then(() => {
        dialogInstance = null;
        createNewDialog();
      });
    } else {
      createNewDialog();
    }
  };

  const createNewDialog = () => {
    dialogInstance = RollDialog.render(showAllActors, dialogInstance);
  };

  button.click(() => {
    console.log("Button clicked, dialogInstance:", dialogInstance);
    createDialog();
  });

  html.find(".main-controls").append(button);
});

// Handle chat button click events
Hooks.on("renderChatMessage", (message, html, data) => {
  html.find(".roll-button").click((event) => {
    const button = $(event.currentTarget);
    const skill = button.data("skill");
    const actorId = button.data("actor");
    const difficultyValue = button.data("difficulty");
    const difficultyName = button.data("difficultyName");
    const successLevel = button.data("successLevel");
    const isPrivate = button.data("private");
    const owners = button.data("owners")
      ? button.data("owners").split(",")
      : [];
    const gms = button.data("gms") ? button.data("gms").split(",") : [];

    const userIsGM = gms.includes(game.user.id);
    const userIsOwner = owners.includes(game.user.id);

    if (userIsGM || userIsOwner) {
      const actor = game.actors.get(actorId);
      const skills = createSkillSelectionDialog(actor);
      const selectedSkill = skills.find((s) => s.name === skill);

      const skillSetup = {
        itemId: selectedSkill?.id || undefined,
        name: undefined,
        key: selectedSkill?.parentSkill || selectedSkill?.name,
      };

      const optionSetup = {
        title: {},
        fields: {
          difficulty:
            difficulties.find((diff) => diff.value == difficultyValue)
              ?.special_name || "unknown",
          rollMode: isPrivate ? "gmroll" : "publicroll",
          SL: isNaN(Number(successLevel)) ? 0 : Number(successLevel),
        },
      };

      actor.setupSkillTest(skillSetup, optionSetup, true);
    } else {
      ui.notifications.warn(
        "You do not have permission to roll for this actor."
      );
    }
  });
});