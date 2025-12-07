# analysis/generate_reports.py
import pandas as pd
import matplotlib.pyplot as plt
from mysql.connector import connect
import bcrypt
import hashlib
import time

class PasswordReportGenerator:
    def __init__(self):
        self.db = connect(host='localhost', database='security_project')
        
    def get_password_data(self):
        query = """
        SELECT password_hash, LENGTH(password_hash) as hash_length,
               created_at FROM users
        """
        return pd.read_sql(query, self.db)
    
    def analyze_hashes(self):
        df = self.get_password_data()
        
        # Calculate hash type distribution
        df['hash_type'] = df['password_hash'].apply(self.detect_hash_type)
        
        # Generate report
        self.generate_plots(df)
        self.export_to_excel(df)
        
    def detect_hash_type(self, hash_value):
        if hash_value.startswith('$2b$'):
            return 'bcrypt'
        elif hash_value.startswith('$argon2'):
            return 'argon2'
        else:
            return 'unknown'
    
    def generate_plots(self, df):
        fig, axes = plt.subplots(2, 2, figsize=(12, 10))
        
        # Hash type distribution
        df['hash_type'].value_counts().plot.pie(
            ax=axes[0,0], autopct='%1.1f%%', title='Hash Algorithm Distribution'
        )
        
        # Hash length distribution
        df['hash_length'].hist(ax=axes[0,1], bins=20)
        axes[0,1].set_title('Hash Length Distribution')
        
        # Creation timeline
        df['created_at'] = pd.to_datetime(df['created_at'])
        df.groupby(df['created_at'].dt.date).size().plot(
            ax=axes[1,0], title='Accounts Created Over Time'
        )
        
        plt.tight_layout()
        plt.savefig('password_analysis_report.png')
        
    def export_to_excel(self, df):
        with pd.ExcelWriter('password_analysis.xlsx') as writer:
            df.to_excel(writer, sheet_name='Raw Data', index=False)
            
            # Summary statistics
            summary = pd.DataFrame({
                'Metric': ['Total Passwords', 'Average Hash Length', 
                          'Most Common Algorithm', 'Date Range'],
                'Value': [len(df), df['hash_length'].mean(),
                         df['hash_type'].mode()[0],
                         f"{df['created_at'].min()} to {df['created_at'].max()}"]
            })
            summary.to_excel(writer, sheet_name='Summary', index=False)

if __name__ == '__main__':
    generator = PasswordReportGenerator()
    generator.analyze_hashes()