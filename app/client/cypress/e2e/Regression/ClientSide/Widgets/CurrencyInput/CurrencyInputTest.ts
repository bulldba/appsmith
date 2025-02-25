import {
  agHelper,
  locators,
  deployMode,
  entityExplorer,
  propPane,
} from "../../../../../support/Objects/ObjectsCore";

describe("CUrrency Input widget Tests", function () {
  before(() => {
    entityExplorer.DragDropWidgetNVerify("currencyinputwidget", 550, 100);
  });

  it("1. Verify property visibility", function () {
    const dataProperties = [
      "defaultvalue",
      "currency",
      "allowcurrencychange",
      "decimalsallowed",
    ];

    const labelProperties = ["text", "position"];

    const validationsProperties = [
      "required",
      "regex",
      "valid",
      "errormessage",
    ];

    const generalProperties = [
      "tooltip",
      "placeholder",
      "showsteparrows",
      "visible",
      "disabled",
      "animateloading",
      "autofocus",
      "height",
    ];

    const eventsProperties = [
      "ontextchanged",
      "onfocus",
      "onblur",
      "onsubmit",
      "resetonsubmit",
    ];

    const labelStylesProperties = ["fontcolor", "fontsize"];

    const borderShadows = ["borderradius", "boxshadow"];

    entityExplorer.SelectEntityByName("CurrencyInput1", "Widgets");
    // Data section
    dataProperties.forEach((dataSectionProperty) => {
      agHelper.AssertElementVisibility(
        propPane._propertyPanePropertyControl("data", `${dataSectionProperty}`),
      );
    });

    // Label section
    labelProperties.forEach((labelSectionProperty) => {
      agHelper.AssertElementVisibility(
        propPane._propertyPanePropertyControl(
          "label",
          `${labelSectionProperty}`,
        ),
      );
    });

    // Validation section
    validationsProperties.forEach((validationSectionProperty) => {
      agHelper.AssertElementVisibility(
        propPane._propertyPanePropertyControl(
          "validation",
          `${validationSectionProperty}`,
        ),
      );
    });

    // General section
    generalProperties.forEach((generalSectionProperty) => {
      agHelper.AssertElementVisibility(
        propPane._propertyPanePropertyControl(
          "general",
          `${generalSectionProperty}`,
        ),
      );
    });

    // Events section
    eventsProperties.forEach((eventsSectionProperty) => {
      agHelper.AssertElementVisibility(
        propPane._propertyPanePropertyControl(
          "events",
          `${eventsSectionProperty}`,
        ),
      );
    });

    propPane.MoveToTab("Style");
    labelStylesProperties.forEach((labelStyleSectionProperty) => {
      agHelper.AssertElementVisibility(
        propPane._propertyPanePropertyControl(
          "labelstyles",
          `${labelStyleSectionProperty}`,
        ),
      );
    });

    borderShadows.forEach((borderShadowSectionProperty) => {
      agHelper.AssertElementVisibility(
        propPane._propertyPanePropertyControl(
          "borderandshadow",
          `${borderShadowSectionProperty}`,
        ),
      );
    });
  });

  it("2. Verify Renaming, duplication and deletion", () => {
    // Rename and verify
    entityExplorer.RenameEntityFromExplorer(
      "CurrencyInput1",
      "NewCurrencyInput",
      true,
    );
    agHelper.AssertElementVisibility(locators._widgetName("NewCurrencyInput"));

    // Copy and paste widget using cmd+c and cmd+v
    entityExplorer.CopyPasteWidget("NewCurrencyInput");
    entityExplorer.AssertEntityPresenceInExplorer("NewCurrencyInputCopy");
    entityExplorer.DeleteWidgetFromEntityExplorer("NewCurrencyInputCopy");

    // Copy paste from property pane and delete from property pane
    propPane.CopyPasteWidgetFromPropertyPane("NewCurrencyInput");
    propPane.DeleteWidgetFromPropertyPane("NewCurrencyInputCopy");
    entityExplorer.SelectEntityByName("NewCurrencyInput", "Widgets");
    propPane.MoveToTab("Content");
  });

  it("3. Verify Default value", () => {
    entityExplorer.DragDropWidgetNVerify("textwidget", 550, 300);
    propPane.UpdatePropertyFieldValue("Text", "1000");
    entityExplorer.SelectEntityByName("NewCurrencyInput", "Widgets");
    propPane.UpdatePropertyFieldValue("Default value", "{{Text1.text}}");
    agHelper.AssertText(locators._input, "val", "1,000");
  });

  it("4. Verify allow currency change toggle", () => {
    propPane.TogglePropertyState("allowcurrencychange", "On");
    agHelper.AssertElementVisibility(propPane._currencyChangeDropdownIcon);
    propPane.TogglePropertyState("allowcurrencychange", "Off");
    agHelper.AssertElementAbsence(propPane._currencyChangeDropdownIcon);
  });

  it("5. Verify changing Label text and position", () => {
    propPane.UpdatePropertyFieldValue("Text", "New Label");
    agHelper.AssertText(locators._label, "text", "New Label");
    agHelper.GetNClick(`${locators._adsV2Text}:contains('Left')`);
    agHelper.AssertAttribute(locators._label, "position", "Left");

    // Preview mode
    agHelper.GetNClick(locators._enterPreviewMode);
    agHelper.AssertAttribute(locators._label, "position", "Left");
    agHelper.GetNClick(locators._exitPreviewMode);

    // Deploy mode
    deployMode.DeployApp();
    agHelper.AssertAttribute(locators._label, "position", "Left");
    deployMode.NavigateBacktoEditor();

    entityExplorer.SelectEntityByName("NewCurrencyInput", "Widgets");
    agHelper.GetNClick(`${locators._adsV2Text}:contains('Top')`);
    agHelper.AssertAttribute(locators._label, "position", "Top");
  });

  it("6. Verify validation Regex, valid criteria and error message", () => {
    // Regex validation
    propPane.UpdatePropertyFieldValue("Regex", "^\\d{1,3}$");
    propPane.UpdatePropertyFieldValue("Error message", "Not valid value");
    agHelper.ClearNType(locators._input, "1234");
    agHelper.AssertPopoverTooltip("Not valid value");
    agHelper.ClearNType(locators._input, "100");
    agHelper.AssertElementAbsence(locators._popoverToolTip);

    // Valid option
    propPane.UpdatePropertyFieldValue("Valid", "{{Text1.isVisible}}");
    entityExplorer.SelectEntityByName("Text1", "Widgets");
    propPane.TogglePropertyState("visible", "Off");
    agHelper.GetNClick(locators._input);
    agHelper.AssertPopoverTooltip("Not valid value");
    entityExplorer.SelectEntityByName("Text1", "Widgets");
    propPane.TogglePropertyState("visible", "On");
    agHelper.GetNClick(locators._input);
    agHelper.AssertElementAbsence(locators._popoverToolTip);
  });

  it("7. Verify tooltip", () => {
    entityExplorer.SelectEntityByName("NewCurrencyInput", "Widgets");
    propPane.UpdatePropertyFieldValue("Tooltip", "{{Text1.text}}");
    agHelper.HoverElement(locators._tooltipIcon);
    agHelper.AssertPopoverTooltip("1000");

    // Preview mode
    agHelper.GetNClick(locators._enterPreviewMode);
    agHelper.HoverElement(locators._tooltipIcon);
    agHelper.AssertPopoverTooltip("1000");
    agHelper.GetNClick(locators._exitPreviewMode);

    // Deploy mode
    deployMode.DeployApp();
    agHelper.HoverElement(locators._tooltipIcon);
    agHelper.AssertPopoverTooltip("1000");
    deployMode.NavigateBacktoEditor();
  });

  it("8. Validate 'visible', 'disable' and 'auto Focus' toggle", () => {
    entityExplorer.SelectEntityByName("NewCurrencyInput");

    // Verify Disabled toggle
    propPane.TogglePropertyState("disabled", "On");
    agHelper.AssertAttribute(
      locators._widgetInDeployed("currencyinputwidget"),
      "disabled",
      "disabled",
    );
    propPane.TogglePropertyState("disabled", "Off");
    // Verify Visible toggle
    propPane.TogglePropertyState("visible", "Off");
    agHelper.AssertAttribute(
      locators._widgetInDeployed("currencyinputwidget"),
      "data-hidden",
      "true",
    );
    agHelper.AssertExistingToggleState("visible", "false");
    propPane.TogglePropertyState("visible", "On");
    agHelper.AssertExistingToggleState("visible", "true");
    // Auto Focus
    propPane.TogglePropertyState("autofocus", "On");
    agHelper.RefreshPage();
    agHelper.AssertElementFocus(locators._input);
  });

  it("9. Validate auto height with limits", function () {
    propPane.SelectPropertiesDropDown("height", "Auto Height with limits");
    agHelper.HoverElement(propPane._autoHeightLimitMin);
    agHelper.AssertContains("Min-Height: 4 rows");
    agHelper.HoverElement(propPane._autoHeightLimitMax);
    agHelper.AssertContains("Max-Height: 9 rows");
    propPane.SelectPropertiesDropDown("height", "Auto Height");
  });

  it("10. Validate events onTextChange, onFocus, OnBlur and OnSubmit", function () {
    // onSubmit
    propPane.SelectPlatformFunction("onSubmit", "Show alert");
    agHelper.TypeText(
      propPane._actionSelectorFieldByLabel("Message"),
      "Value Submitted",
    );
    agHelper.GetNClick(propPane._actionSelectorPopupClose);

    agHelper.ClearNType(locators._input, "101");
    agHelper.GetElement(locators._input).type("{enter}");
    agHelper.ValidateToastMessage("Value Submitted");

    // onTextChange
    propPane.SelectPlatformFunction("onTextChanged", "Show alert");
    agHelper.TypeText(
      propPane._actionSelectorFieldByLabel("Message"),
      "Value Changed",
    );
    agHelper.GetNClick(propPane._actionSelectorPopupClose);

    agHelper.ClearNType(locators._input, "100");
    agHelper.ValidateToastMessage("Value Changed");

    // onFocus
    propPane.SelectPlatformFunction("onFocus", "Show alert");
    agHelper.TypeText(
      propPane._actionSelectorFieldByLabel("Message"),
      "Value Focused",
    );
    agHelper.GetNClick(propPane._actionSelectorPopupClose);

    agHelper.GetNClick(locators._input);
    agHelper.ValidateToastMessage("Value Focused");

    // OnBlur
    propPane.SelectPlatformFunction("onBlur", "Show alert");
    agHelper.TypeText(
      propPane._actionSelectorFieldByLabel("Message"),
      "Blurred",
    );
    agHelper.GetNClick(propPane._actionSelectorPopupClose);

    agHelper.GetNClick(locators._input);
    agHelper.WaitUntilToastDisappear("Value Focused");
    agHelper.ClickOutside();
    agHelper.ValidateToastMessage("Blurred");
  });

  it("11. Verify Full color picker and font size", () => {
    // Verify font color picker opens up
    propPane.MoveToTab("Style");
    agHelper.GetNClick(propPane._propertyControlColorPicker("fontcolor"));
    agHelper.AssertElementVisibility(propPane._colorPickerV2Color);
    // Verify full color picker
    agHelper.AssertAttribute(propPane._colorPickerInput, "type", "text", 0);
    propPane.TogglePropertyState("fontcolor", "On", "updateLayout", false);
    agHelper.AssertAttribute(propPane._colorPickerInput, "type", "color", 0);
    // Font size
    propPane.SelectPropertiesDropDown("fontsize", "L");
    propPane.AssertPropertiesDropDownCurrentValue("fontsize", "L");
    propPane.ToggleJSMode("fontsize", true);
    propPane.UpdatePropertyFieldValue("Font size", "1rem");
    propPane.ToggleJSMode("fontsize", false);
    propPane.AssertPropertiesDropDownCurrentValue("fontsize", "M");
    // Verify Emphasis
    agHelper.GetNClick(propPane._emphasisSelector("BOLD"));
    agHelper.AssertAttribute(locators._label, "font-style", "BOLD");
    agHelper.GetNClick(propPane._emphasisSelector("BOLD"));
    propPane.ToggleJSMode("emphasis", true);
    propPane.UpdatePropertyFieldValue("Emphasis", "ITALIC");
    agHelper.AssertAttribute(locators._label, "font-style", "ITALIC");

    // Preview mode
    agHelper.GetNClick(locators._enterPreviewMode);
    agHelper.AssertAttribute(locators._label, "font-style", "ITALIC");
    agHelper.GetNClick(locators._exitPreviewMode);

    // Deploy mode
    deployMode.DeployApp();
    agHelper.AssertAttribute(locators._label, "font-style", "ITALIC");
    deployMode.NavigateBacktoEditor();

    entityExplorer.SelectEntityByName("NewCurrencyInput", "Widgets");
    propPane.MoveToTab("Style");

    // Verify border
    agHelper.GetNClick(propPane._segmentedControl("0px"));
    agHelper.AssertCSS(".text-input-wrapper", "border-radius", "0px");

    // Verify Box Shadow
    agHelper.GetNClick(`${propPane._segmentedControl("0")}:contains('Large')`);
    agHelper.AssertCSS(
      ".text-input-wrapper",
      "box-shadow",
      "rgba(0, 0, 0, 0.1) 0px 10px 15px -3px, rgba(0, 0, 0, 0.05) 0px 4px 6px -2px",
    );
  });
});
