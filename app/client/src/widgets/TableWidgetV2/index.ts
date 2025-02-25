import { Colors } from "constants/Colors";
import { FILL_WIDGET_MIN_WIDTH } from "constants/minWidthConstants";
import { ResponsiveBehavior } from "utils/autoLayout/constants";
import type { WidgetProps } from "widgets/BaseWidget";
import {
  ALLOW_TABLE_WIDGET_SERVER_SIDE_FILTERING,
  InlineEditingSaveOptions,
} from "./constants";
import type { TableWidgetProps } from "./constants";
import IconSVG from "./icon.svg";
import Widget from "./widget";
import type {
  WidgetQueryConfig,
  WidgetQueryGenerationFormConfig,
} from "WidgetQueryGenerators/types";
import type { PropertyUpdates, SnipingModeProperty } from "widgets/constants";
import { WIDGET_TAGS } from "constants/WidgetConstants";

export const CONFIG = {
  type: Widget.getWidgetType(),
  name: "Table",
  iconSVG: IconSVG,
  tags: [WIDGET_TAGS.SUGGESTED_WIDGETS, WIDGET_TAGS.DISPLAY],
  needsMeta: true,
  needsHeightForContent: true,
  defaults: {
    responsiveBehavior: ResponsiveBehavior.Fill,
    minWidth: FILL_WIDGET_MIN_WIDTH,
    rows: 28,
    canFreezeColumn: true,
    columnUpdatedAt: Date.now(),
    columns: 34,
    animateLoading: true,
    defaultSelectedRowIndex: 0,
    defaultSelectedRowIndices: [0],
    enableServerSideFiltering: Widget.getFeatureFlag(
      ALLOW_TABLE_WIDGET_SERVER_SIDE_FILTERING,
    )
      ? false
      : undefined,
    label: "Data",
    widgetName: "Table",
    searchKey: "",
    textSize: "0.875rem",
    horizontalAlignment: "LEFT",
    verticalAlignment: "CENTER",
    totalRecordsCount: 0,
    defaultPageSize: 0,
    dynamicPropertyPathList: [],
    borderColor: Colors.GREY_5,
    borderWidth: "1",
    dynamicBindingPathList: [],
    primaryColumns: {},
    tableData: "",
    columnWidthMap: {},
    columnOrder: [],
    enableClientSideSearch: true,
    isVisibleSearch: true,
    isVisibleFilters: true,
    isVisibleDownload: true,
    isVisiblePagination: true,
    isSortable: true,
    delimiter: ",",
    version: 2,
    inlineEditingSaveOption: InlineEditingSaveOptions.ROW_LEVEL,
  },
  properties: {
    derived: Widget.getDerivedPropertiesMap(),
    default: Widget.getDefaultPropertiesMap(),
    meta: Widget.getMetaPropertiesMap(),
    contentConfig: Widget.getPropertyPaneContentConfig(),
    styleConfig: Widget.getPropertyPaneStyleConfig(),
    stylesheetConfig: Widget.getStylesheetConfig(),
    loadingProperties: Widget.getLoadingProperties(),
    autocompleteDefinitions: Widget.getAutocompleteDefinitions(),
    setterConfig: Widget.getSetterConfig(),
  },
  methods: {
    getQueryGenerationConfig: (widgetProps: WidgetProps) => {
      return Widget.getQueryGenerationConfig(widgetProps);
    },
    getPropertyUpdatesForQueryBinding: (
      queryConfig: WidgetQueryConfig,
      widget: WidgetProps,
      formConfig: WidgetQueryGenerationFormConfig,
    ) => {
      return Widget.getPropertyUpdatesForQueryBinding(
        queryConfig,
        widget as TableWidgetProps,
        formConfig,
      );
    },
    getSnipingModeUpdates: (
      propValueMap: SnipingModeProperty,
    ): PropertyUpdates[] => {
      return [
        {
          propertyPath: "tableData",
          propertyValue: propValueMap.data,
          isDynamicPropertyPath: false,
        },
      ];
    },
  },
  autoLayout: {
    widgetSize: [
      {
        viewportMinWidth: 0,
        configuration: () => {
          return {
            minWidth: "280px",
            minHeight: "300px",
          };
        },
      },
    ],
  },
};

export default Widget;
