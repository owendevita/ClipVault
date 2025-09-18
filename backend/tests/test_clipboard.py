import sys, os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from clipboard import ClipboardManager

def test_clipboard_operations():
    """Test basic clipboard operations"""
    # Initialize clipboard manager
    cm = ClipboardManager()
    
    # Test setting and getting clipboard content
    # This tests the basic functionality of copying and pasting
    test_content = "Test ClipVault Content"
    
    # Verify that content can be set to clipboard
    assert cm.set_clipboard_content(test_content) == True
    
    # Verify that content can be retrieved from clipboard
    assert cm.get_clipboard_content() == test_content